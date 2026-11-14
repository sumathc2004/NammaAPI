import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import type { AepsProfile } from "@/lib/auth/demoSession";

/** The vendor's OTPs are short numeric codes; this is a sanity check, not a format spec. */
const OTP_PATTERN = /^\d{3,8}$/;

export type AepsLoginResult =
  | { ok: true; otp: string; acceptedOtps: string[]; profile: AepsProfile }
  | { ok: false; error: string; reason: "invalid_credentials" | "unavailable" };

type LoginResponse = Partial<
  Record<
    | "MESSAGE"
    | "defaultOTP"
    | "Otp"
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

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
const isTrue = (value: unknown) =>
  value === true || (typeof value === "string" && ["true", "1", "yes"].includes(value.trim().toLowerCase())) || value === 1;

/**
 * A boolean flag from the response. Matched by normalized name (the vendor's casing and separators
 * vary), either exactly or, with `loose`, by any field whose name contains it.
 */
function flag(root: Record<string, unknown>, name: string, loose = false): boolean {
  return Object.entries(root).some(([key, value]) => {
    const k = normalizeKey(key);
    return (loose ? k.includes(name) : k === name) && isTrue(value);
  });
}

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

/** The login response's fields: JSON is a flat object; the XML form wraps them in <AEPSController.NPLoginResponse>. */
function loginRoot(body: unknown): LoginResponse {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  return ((record?.["AEPSController.NPLoginResponse"] as LoginResponse | undefined) ?? record ?? {}) as LoginResponse;
}

/**
 * Logs in with the vendor's `POST GetV2LoginInfo_api?UserName=&Password=` (parameters in the query
 * string even though it's a POST). The JSON response carries the balances and two codes: `Otp`
 * (the per-request code sent to the customer by SMS) and `defaultOTP` (the account's fixed
 * fallback). Either one is accepted at login, so both are returned.
 *
 * Since mid-November 2026 the `_api` endpoint answers `MESSAGE: "Failed"` for every account, while its
 * twin `GET GetV2LoginInfo?UserName=&Password=` (same response; "Failed" for a wrong password) still
 * works. So when `_api` says anything but "Success", the GET form is asked before the login is refused.
 * Once the vendor fixes `_api`, the fallback simply stops being used.
 */
export async function requestAepsOtp(phone: string, password: string): Promise<AepsLoginResult> {
  const params = { UserName: phone, Password: password };
  let result = await aepsRequest("GetV2LoginInfo_api", params, { method: "POST", prefer: "json" });
  if (!result.ok || text(loginRoot(result.body).MESSAGE) !== "Success") {
    const fallback = await aepsRequest("GetV2LoginInfo", params, { method: "GET", prefer: "json" });
    // Keep the first answer when the fallback can't be reached, so a wrong password still says so.
    if (fallback.ok || !result.ok) {
      if (fallback.ok && text(loginRoot(fallback.body).MESSAGE) === "Success") console.info("AEPS login: GetV2LoginInfo_api refused, GET GetV2LoginInfo accepted.");
      result = fallback;
    }
  }
  if (!result.ok) return { ok: false, error: result.error, reason: "unavailable" };

  const root = loginRoot(result.body);
  const message = text(root.MESSAGE);
  const defaultOtp = text(root.defaultOTP);
  const smsOtp = text(root.Otp);
  // Either code logs in. The default one is listed first (it sets the box count); the SMS code is also valid.
  const acceptedOtps = [defaultOtp, smsOtp].filter((code, i, all) => OTP_PATTERN.test(code) && all.indexOf(code) === i);
  const otp = acceptedOtps[0] ?? "";

  if (message === "Success") {
    // Names and values of the role flags only (no credentials, codes or balances), to see what the vendor sends.
    const flags = Object.entries(root)
      .filter(([key]) => /^(is|can)/i.test(key) || /admin|accountant|access/i.test(key))
      .map(([key, value]) => `${key}=${typeof value === "boolean" || typeof value === "number" ? value : JSON.stringify(text(value))}`);
    console.log(`AEPS login role flags: ${flags.join(", ") || "(none in the response)"}`);
    // Field names only, no values: which identity/parent/client fields does the login response carry?
    // Lists and objects are marked with their size (a retailer list would show up as e.g. "Retailers:array(5)").
    const shape = Object.entries(root).map(([key, value]) =>
      Array.isArray(value) ? `${key}:array(${value.length})` : value && typeof value === "object" ? `${key}:object(${Object.keys(value).length})` : key,
    );
    console.log(`AEPS login fields: ${shape.join(", ")}`);
  }

  if (message !== "Success") {
    return { ok: false, error: message || "Invalid phone number or password.", reason: "invalid_credentials" };
  }

  if (!otp) {
    console.error("AEPS login reported Success but the response had no usable Otp or defaultOTP.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR, reason: "unavailable" };
  }

  return {
    ok: true,
    otp,
    acceptedOtps,
    profile: {
      userName: text(root.UserName) || phone,
      balance: text(root.Balance),
      walletBalance: text(root.walletBalance),
      creditBalance: text(root.CreditBalance),
      aepsBalance: text(root.aepsBalance),
      bbpsBalance: text(root.bbpsBalance),
      cmsBalance: text(root.cmsBalance),
      isAdmin: flag(root, "isadmin"),
      isAccountant: flag(root, "accountant", true),
      isSuperAccess: flag(root, "superaccess", true),
    },
  };
}
