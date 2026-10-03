import "server-only";
import { XMLParser } from "fast-xml-parser";
import { getAepsApiBaseUrl } from "@/lib/server/env";
import type { AepsProfile } from "@/lib/auth/demoSession";

const REQUEST_TIMEOUT_MS = 15_000;
/** The vendor's OTPs are short numeric codes; this is a sanity check, not a format spec. */
const OTP_PATTERN = /^\d{3,8}$/;

export type AepsLoginResult =
  | { ok: true; otp: string; profile: AepsProfile }
  | { ok: false; error: string; reason: "invalid_credentials" | "unavailable" };

const UNAVAILABLE_ERROR = "The login service is temporarily unavailable. Please try again shortly.";
const UNEXPECTED_RESPONSE_ERROR = "The login service returned an unexpected response. Please try again shortly.";

// parseTagValue is off deliberately: numeric parsing would strip a leading "0" from an OTP
// (e.g. "0482" -> 482) and the match would then fail for roughly 1 in 10 codes.
const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

type NPLoginResponse = Partial<
  Record<
    "MESSAGE" | "defaultOTP" | "UserName" | "Balance" | "walletBalance" | "aepsBalance" | "bbpsBalance" | "cmsBalance",
    string
  >
>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Calls the vendor's AEPS login endpoint (GET GetV2LoginInfo) with a phone number and password.
 * On success the response carries the account's balances and two codes: `Otp` and `defaultOTP`.
 * PROTOTYPE: login is checked against `defaultOTP`, the account's fixed code, because the
 * per-request `Otp` isn't delivered by SMS yet.
 *
 * The endpoint takes the password as a query parameter (the vendor's design), so the password
 * is part of this server's outbound URL — never log that URL.
 */
export async function requestAepsOtp(phone: string, password: string): Promise<AepsLoginResult> {
  const url = new URL(`${getAepsApiBaseUrl()}/GetV2LoginInfo`);
  url.searchParams.set("UserName", phone);
  url.searchParams.set("Password", password);

  let responseText: string;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/xml, text/xml" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    responseText = await response.text();
    if (!response.ok) {
      console.error(`AEPS login endpoint returned HTTP ${response.status}.`);
      return { ok: false, error: UNAVAILABLE_ERROR, reason: "unavailable" };
    }
  } catch (err) {
    console.error("AEPS login request failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: UNAVAILABLE_ERROR, reason: "unavailable" };
  }

  let parsed: unknown;
  try {
    parsed = xmlParser.parse(responseText);
  } catch (err) {
    console.error("AEPS login response was not valid XML:", err instanceof Error ? err.message : err);
    return { ok: false, error: UNEXPECTED_RESPONSE_ERROR, reason: "unavailable" };
  }

  const root = (parsed as Record<string, NPLoginResponse> | null)?.["AEPSController.NPLoginResponse"];
  const message = text(root?.MESSAGE);
  const otp = text(root?.defaultOTP);

  if (message !== "Success") {
    return { ok: false, error: message || "Invalid phone number or password.", reason: "invalid_credentials" };
  }

  if (!OTP_PATTERN.test(otp)) {
    console.error("AEPS login reported Success but the response had no usable defaultOTP.");
    return { ok: false, error: UNEXPECTED_RESPONSE_ERROR, reason: "unavailable" };
  }

  return {
    ok: true,
    otp,
    profile: {
      userName: text(root?.UserName) || phone,
      balance: text(root?.Balance),
      walletBalance: text(root?.walletBalance),
      aepsBalance: text(root?.aepsBalance),
      bbpsBalance: text(root?.bbpsBalance),
      cmsBalance: text(root?.cmsBalance),
    },
  };
}
