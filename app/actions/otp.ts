"use server";

import { redirect } from "next/navigation";
import { apiFetch, createSession, readProblem, type AuthResponse } from "@/lib/auth/session";

export type OtpStartResult =
  | { ok: true; challengeId: string; maskedPhone: string; resendAfterSeconds: number; devCode: string | null }
  | { ok: false; errors?: { phone?: string; password?: string }; message?: string; noAccount?: boolean };

export type OtpVerifyResult = { error?: string; expired?: boolean };

const UNAVAILABLE = "We couldn't reach the server. Please try again in a moment.";

export async function startPhoneLogin(phone: string, password: string): Promise<OtpStartResult> {
  let res: Response;
  try {
    res = await apiFetch("/api/auth/otp/start", { method: "POST", body: JSON.stringify({ phone, password }) });
  } catch {
    return { ok: false, message: UNAVAILABLE };
  }

  if (res.ok) return { ok: true, ...(await res.json()) };

  const problem = await readProblem(res);
  return {
    ok: false,
    errors: { phone: problem.errors?.phone?.[0], password: problem.errors?.password?.[0] },
    message: problem.errors ? undefined : (problem.detail ?? "Could not send the OTP. Please try again."),
    noAccount: res.status === 404,
  };
}

export async function verifyPhoneOtp(challengeId: string, otp: string): Promise<OtpVerifyResult> {
  let res: Response;
  try {
    res = await apiFetch("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ challengeId, otp }) });
  } catch {
    return { error: UNAVAILABLE };
  }

  if (!res.ok) {
    const problem = await readProblem(res);
    return {
      error: problem.errors?.otp?.[0] ?? problem.detail ?? "Could not verify the OTP.",
      // 410: expired/used, 429: too many attempts — the user needs a fresh OTP.
      expired: res.status === 410 || res.status === 429,
    };
  }

  await createSession((await res.json()) as AuthResponse);
  redirect("/dashboard");
}
