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

/**
 * Logs in with the vendor's `POST GetV2LoginInfo_api?UserName=&Password=` (parameters in the query
 * string even though it's a POST). The JSON response carries the balances and two codes: `Otp`
 * (the per-request code sent to the customer by SMS) and `defaultOTP` (the account's fixed
 * fallback). Either one is accepted at login, so both are returned.
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
