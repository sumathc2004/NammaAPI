import { NextResponse } from "next/server";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/validation/fields";
import { requestAepsOtp } from "@/lib/server/aepsAuth";
import { setSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const MAX_PASSWORD_LENGTH = 128;
const RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

// PROTOTYPE: this returns the OTP to the browser, which compares it in the OTP modal. Anyone can
// read the OTP from the network tab, so this is not real verification — before real users log
// in, keep the OTP on the server and check it in a separate verify request instead.
export async function POST(request: Request) {
  const rate = checkRateLimit(`auth-login:${getClientIp(request)}`, RATE_LIMIT);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawPhone = typeof body?.phoneNumber === "string" ? body.phoneNumber : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidIndianMobile(rawPhone)) {
    return NextResponse.json({ error: "Enter a valid 10-digit phone number." }, { status: 400 });
  }
  if (!password || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const phone = normalizeIndianMobile(rawPhone);
  const result = await requestAepsOtp(phone, password);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.reason === "invalid_credentials" ? 401 : 503 },
    );
  }

  // Keep the credentials server-side (encrypted httpOnly cookie) for later vendor calls such as
  // the dashboard reports. The response itself never contains the password.
  await setSessionCredentials({ userName: phone, password, isAdmin: result.profile.isAdmin === true });

  return NextResponse.json({ ok: true, otp: result.otp, profile: result.profile });
}
