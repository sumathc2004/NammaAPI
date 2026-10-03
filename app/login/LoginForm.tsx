"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { isValidIndianMobile } from "@/lib/validation/fields";
import { saveDemoSession, type AepsProfile } from "@/lib/auth/demoSession";
import { OtpDialog } from "@/app/login/OtpDialog";

/** PROTOTYPE: set to true to print the expected OTP (the account's defaultOTP) inside the modal. */
const SHOW_DEMO_OTP = false;

type CredentialErrors = { phoneNumber?: string; password?: string };
type PendingLogin = { otp: string; profile: AepsProfile };

export function LoginForm() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<CredentialErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingLogin | null>(null);

  /** Calls the login API (which does the GET). Returns an error message, or null on success. */
  async function requestOtp(): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.otp) {
        return data?.error || "We couldn't log you in. Please try again.";
      }

      setPending({ otp: data.otp, profile: data.profile });
      return null;
    } catch {
      return "Something went wrong. Please check your connection and try again.";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);

    const next: CredentialErrors = {};
    if (!isValidIndianMobile(phoneNumber.trim())) next.phoneNumber = "Enter a valid 10-digit phone number.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setApiError(await requestOtp());
    setSubmitting(false);
  }

  function handleVerify(otp: string): string | null {
    if (!pending || otp !== pending.otp) return "That code isn't right. Please try again.";
    saveDemoSession(pending.profile);
    router.push("/dashboard");
    return null;
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormInput
          label="Phone Number"
          type="tel"
          required
          autoComplete="tel"
          maxLength={20}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          error={errors.phoneNumber}
          placeholder="98765 43210"
        />
        <FormInput
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
        />

        {apiError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Logging in…" : "Login"}
        </Button>

        <p className="text-center text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-brand-primary hover:text-brand-dark">
            Create one
          </Link>
        </p>
      </form>

      {pending && (
        <OtpDialog
          phone={phoneNumber}
          length={pending.otp.length}
          demoOtp={SHOW_DEMO_OTP ? pending.otp : undefined}
          onVerify={handleVerify}
          onResend={requestOtp}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}
