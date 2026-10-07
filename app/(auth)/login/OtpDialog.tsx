"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const RESEND_COOLDOWN_SECONDS = 30;

type OtpDialogProps = {
  phone: string;
  /** Number of digit boxes to show. */
  length: number;
  /** Prototype only: when set, the expected OTP is printed in the modal. */
  demoOtp?: string;
  /** Fills the boxes on open (PROTOTYPE: the account's default OTP), so only Verify needs pressing. */
  prefill?: string;
  /** Returns an error message, or null when the OTP matched. */
  onVerify: (otp: string) => string | null;
  /** Requests a new OTP. Returns an error message, or null on success. */
  onResend: () => Promise<string | null>;
  onClose: () => void;
};

type Status = "idle" | "error" | "success";

/** Shows only the last 2 digits, e.g. "9206558539" -> "••••••••39". */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 2 ? digits : "•".repeat(digits.length - 2) + digits.slice(-2);
}

function formatCountdown(seconds: number): string {
  return `0:${String(seconds).padStart(2, "0")}`;
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function OtpDialog({ phone, length, demoOtp, prefill, onVerify, onResend, onClose }: OtpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const [digits, setDigits] = useState<string[]>(() =>
    prefill && prefill.length === length ? prefill.split("") : Array(length).fill(""),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  const isComplete = digits.every(Boolean);
  const isLocked = status === "success";

  // Open as a modal on mount. No close() in cleanup: in development React mounts, unmounts and
  // remounts every component, and the `close` event that close() fires would dismiss the modal.
  // Unmounting removes the dialog from the page anyway.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function focusBox(index: number) {
    const input = inputsRef.current[Math.max(0, Math.min(length - 1, index))];
    input?.focus();
    input?.select();
  }

  function verify(code: string) {
    if (code.length !== length) {
      setStatus("error");
      setError(`Enter all ${length} digits.`);
      return;
    }
    const verifyError = onVerify(code);
    if (verifyError) {
      setStatus("error");
      setError(verifyError);
      setShakeKey((k) => k + 1);
      setDigits(Array(length).fill(""));
      requestAnimationFrame(() => focusBox(0));
    } else {
      setStatus("success");
      setError(null);
    }
  }

  /** Writes one or more digits starting at `index` — covers typing, paste and SMS autofill. */
  function fillFrom(index: number, value: string) {
    const chars = value.replace(/\D/g, "").slice(0, length - index).split("");
    if (chars.length === 0) return;

    const next = [...digits];
    chars.forEach((char, offset) => (next[index + offset] = char));
    setDigits(next);
    setStatus("idle");
    setError(null);

    const nextIndex = index + chars.length;
    if (next.every(Boolean)) {
      inputsRef.current[Math.min(nextIndex, length) - 1]?.blur();
      verify(next.join(""));
    } else {
      focusBox(nextIndex);
    }
  }

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    // Typing into a box that already holds a digit gives two characters: keep the new one.
    if (value.length === 2 && digits[index]) {
      fillFrom(index, value[0] === digits[index] ? value[1] : value[0]);
      return;
    }
    fillFrom(index, value);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      focusBox(index - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    fillFrom(index, e.clipboardData.getData("text"));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    verify(digits.join(""));
  }

  async function handleResend() {
    setResending(true);
    const resendError = await onResend();
    setResending(false);

    if (resendError) {
      setStatus("error");
      setError(resendError);
      return;
    }
    setDigits(Array(length).fill(""));
    setStatus("idle");
    setError(null);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    focusBox(0);
  }

  const boxStateClasses =
    status === "success"
      ? "border-status-success bg-status-success-bg text-status-success"
      : status === "error"
        ? "border-red-300 bg-red-50/60 text-text-primary focus:border-red-500 focus:ring-red-500/15"
        : "border-brand-border bg-white text-text-primary focus:border-brand-primary focus:ring-brand-primary/15";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        // Escape key: let the parent unmount the dialog instead of the browser closing it.
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="otp-dialog-title"
      aria-describedby="otp-dialog-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md animate-dialog-in overflow-hidden rounded-3xl bg-white p-0 shadow-2xl shadow-brand-navy/30 backdrop:animate-backdrop-in backdrop:bg-brand-navy/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        {/* Decorative brand header */}
        <div className="absolute inset-x-0 top-0 h-28 bg-brand-gradient" aria-hidden="true">
          <div className="absolute inset-0 bg-dot-grid-light opacity-60" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} noValidate className="relative px-6 pb-7 pt-14 sm:px-9 sm:pb-9">
          <div
            className={cn(
              "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ring-4 ring-white transition-colors duration-300",
              isLocked ? "bg-status-success text-white" : "bg-white text-brand-primary",
            )}
          >
            {isLocked ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3L19 6V11C19 15.5 16 19.3 12 20.5C8 19.3 5 15.5 5 11V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="mt-5 text-center">
            <h2 id="otp-dialog-title" className="text-2xl font-bold tracking-tight text-text-primary">
              {isLocked ? "You're verified" : "Verify it's you"}
            </h2>
            <p id="otp-dialog-description" className="mt-2 text-sm text-text-secondary">
              {isLocked ? (
                "Taking you to your dashboard…"
              ) : (
                <>
                  Enter the {length}-digit code for{" "}
                  <span className="font-semibold text-text-primary">{maskPhone(phone)}</span>
                  <span aria-hidden="true"> · </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="font-semibold text-brand-primary underline-offset-2 hover:underline"
                  >
                    Change
                  </button>
                </>
              )}
            </p>
          </div>

          {demoOtp && !isLocked && (
            <p className="mx-auto mt-4 w-fit rounded-full border border-dashed border-brand-primary/40 bg-brand-light px-3 py-1 text-xs text-text-secondary">
              Prototype · OTP is <span className="font-mono font-semibold text-text-primary">{demoOtp}</span>
            </p>
          )}

          <div
            key={shakeKey}
            role="group"
            aria-label={`${length}-digit one-time password`}
            className={cn("mt-7 flex justify-center gap-2 sm:gap-3", status === "error" && shakeKey > 0 && "animate-shake")}
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(index, e)}
                onFocus={(e) => e.target.select()}
                disabled={isLocked}
                autoFocus={index === 0}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1} of ${length}`}
                aria-invalid={status === "error"}
                className={cn(
                  "aspect-[4/5] w-full min-w-0 max-w-14 flex-1 rounded-xl border-2 text-center font-mono text-2xl font-semibold outline-none transition-all duration-150 focus:ring-4 disabled:cursor-default",
                  boxStateClasses,
                  digit && status === "idle" && "border-brand-primary/60 bg-brand-light/50",
                )}
              />
            ))}
          </div>

          <p role="alert" className="mt-3 min-h-5 text-center text-sm font-medium text-red-600">
            {error}
          </p>

          <Button type="submit" size="lg" className="mt-3 w-full" disabled={!isComplete || isLocked}>
            {isLocked ? (
              <>
                <Spinner />
                Opening dashboard…
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          <p className="mt-5 text-center text-sm text-text-secondary">
            Didn&apos;t get the code?{" "}
            {cooldown > 0 ? (
              <span className="font-medium tabular-nums text-text-primary">Resend in {formatCountdown(cooldown)}</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || isLocked}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-primary hover:text-brand-dark disabled:opacity-60"
              >
                {resending && <Spinner />}
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </p>
        </form>
      </div>
    </dialog>
  );
}
