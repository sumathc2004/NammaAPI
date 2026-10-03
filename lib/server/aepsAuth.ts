import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import type { AepsProfile } from "@/lib/auth/demoSession";

/** The vendor's OTPs are short numeric codes; this is a sanity check, not a format spec. */
const OTP_PATTERN = /^\d{3,8}$/;

export type AepsLoginResult =
  | { ok: true; otp: string; profile: AepsProfile }
  | { ok: false; error: string; reason: "invalid_credentials" | "unavailable" };

type LoginResponse = Partial<
  Record<
    | "MESSAGE"
    | "defaultOTP"
    | "UserName"
    | "Balance"
    | "walletBalance"
    | "CreditBalance"
    | "aepsBalance"
    | "bbpsBalance"
    | "cmsBalance"
    | "isAdmin",
    unknown
  >
>;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

/**
 * Logs in with the vendor's `POST GetV2LoginInfo_api?UserName=&Password=` (parameters in the query
 * string even though it's a POST). The JSON response carries the balances and two codes: `Otp` and
 * `defaultOTP`. PROTOTYPE: login is checked against `defaultOTP`, the account's fixed code, because
 * the per-request `Otp` isn't delivered by SMS yet.
 */
export async function requestAepsOtp(phone: string, password: string): Promise<AepsLoginResult> {
  const result = await aepsRequest(
    "GetV2LoginInfo_api",
    { UserName: phone, Password: password },
    { method: "POST", prefer: "json" },
  );
  if (!result.ok) return { ok: false, error: result.error, reason: "unavailable" };

  // JSON is a flat object; the XML form wraps the same fields in <AEPSController.NPLoginResponse>.
  const body = result.body as Record<string, unknown> | null;
  const root = ((body?.["AEPSController.NPLoginResponse"] as LoginResponse | undefined) ?? body ?? {}) as LoginResponse;
  const message = text(root.MESSAGE);
  const otp = text(root.defaultOTP);

  if (message !== "Success") {
    return { ok: false, error: message || "Invalid phone number or password.", reason: "invalid_credentials" };
  }

  if (!OTP_PATTERN.test(otp)) {
    console.error("AEPS login reported Success but the response had no usable defaultOTP.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR, reason: "unavailable" };
  }

  return {
    ok: true,
    otp,
    profile: {
      userName: text(root.UserName) || phone,
      balance: text(root.Balance),
      walletBalance: text(root.walletBalance),
      creditBalance: text(root.CreditBalance),
      aepsBalance: text(root.aepsBalance),
      bbpsBalance: text(root.bbpsBalance),
      cmsBalance: text(root.cmsBalance),
      // JSON sends a boolean; the XML form sends the text "true".
      isAdmin: root.isAdmin === true || text(root.isAdmin).toLowerCase() === "true",
    },
  };
}
