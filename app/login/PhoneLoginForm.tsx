"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { FormInput } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/auth/AuthCard";
import { startPhoneLogin, verifyPhoneOtp } from "@/app/actions/otp";

type Challenge = { id: string; maskedPhone: string; devCode: string | null };
type Message = { tone: "error" | "success"; text: string; noAccount?: boolean };

export function PhoneLoginForm() {
  // Phone and password stay in memory only, so "Resend OTP" can repeat the Namma Payments login.
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; otp?: string }>({});
  const [message, setMessage] = useState<Message>();
  const [pending, startTransition] = useTransition();
  const otpStepRef = useRef<HTMLFormElement>(null);

  // Move focus to the OTP field whenever a new code is sent.
  useEffect(() => {
    if (challenge) otpStepRef.current?.querySelector<HTMLInputElement>("input[autocomplete=one-time-code]")?.focus();
  }, [challenge]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function sendOtp(isResend = false) {
    setMessage(undefined);
    const next: typeof errors = {};
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Enter your 10-digit mobile number.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    startTransition(async () => {
      const result = await startPhoneLogin(phone, password);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        if (result.message) setMessage({ tone: "error", text: result.message, noAccount: result.noAccount });
        return;
      }
      setChallenge({ id: result.challengeId, maskedPhone: result.maskedPhone, devCode: result.devCode });
      setResendIn(result.resendAfterSeconds);
      setOtp("");
      if (isResend) setMessage({ tone: "success", text: "A new OTP has been sent." });
    });
  }

  function verify(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    if (!/^\d{4,8}$/.test(otp)) {
      setErrors({ otp: "Enter the OTP sent to your phone." });
      return;
    }
    setErrors({});
    setMessage(undefined);
    startTransition(async () => {
      const result = await verifyPhoneOtp(challenge.id, otp);
      // On success the action redirects to the dashboard.
      if (result?.expired) {
        setMessage({ tone: "error", text: result.error ?? "This OTP has expired." });
        setOtp("");
      } else if (result?.error) {
        setErrors({ otp: result.error });
      }
    });
  }

  const notice = message && (
    <Notice tone={message.tone}>
      {message.text}
      {message.noAccount && (
        <>
          {" "}
          <Link href="/signup" className="font-semibold underline">
            Create an account
          </Link>
        </>
      )}
    </Notice>
  );

  if (!challenge) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendOtp();
        }}
        noValidate
        className="space-y-5"
      >
        {notice}
        <FormInput
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          placeholder="98765 43210"
        />
        <FormInput
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="Your Namma Payments password. We'll then send an OTP to this number."
          placeholder="••••••••"
        />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending OTP…" : "Send OTP"}
        </Button>
      </form>
    );
  }

  return (
    <form ref={otpStepRef} onSubmit={verify} noValidate className="space-y-5">
      {notice}
      {challenge.devCode && (
        <Notice tone="success">
          Development mode — your OTP is{" "}
          <strong className="font-mono tracking-widest">{challenge.devCode}</strong>
        </Notice>
      )}
      <p className="text-sm text-text-secondary">
        Enter the OTP sent to <strong className="text-text-primary">{challenge.maskedPhone}</strong>. It&apos;s valid
        for 5 minutes.
      </p>
      <FormInput
        label="OTP"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        required
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        error={errors.otp}
        placeholder="Enter OTP"
        className="text-center font-mono text-lg tracking-[0.4em]"
      />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Verifying…" : "Verify & log in"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="font-medium text-brand-primary hover:text-brand-dark"
          onClick={() => {
            setChallenge(null);
            setMessage(undefined);
            setErrors({});
          }}
        >
          Change number
        </button>
        <button
          type="button"
          disabled={resendIn > 0 || pending}
          onClick={() => sendOtp(true)}
          className="font-medium text-brand-primary hover:text-brand-dark disabled:text-text-secondary"
        >
          {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
        </button>
      </div>
    </form>
  );
}
