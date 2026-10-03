"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearDemoSession, type AepsProfile } from "@/lib/auth/demoSession";
import { cn } from "@/lib/cn";

type BalanceKey = "walletBalance" | "creditBalance" | "aepsBalance" | "bbpsBalance" | "cmsBalance";

const balanceRows: { key: BalanceKey; label: string }[] = [
  { key: "walletBalance", label: "Debit wallet" },
  { key: "creditBalance", label: "Credit wallet" },
  { key: "aepsBalance", label: "AEPS" },
  { key: "bbpsBalance", label: "BBPS" },
  { key: "cmsBalance", label: "CMS" },
];

function formatInr(value: string | undefined): string {
  const amount = Number((value ?? "").replace(/,/g, ""));
  if (!value || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.8-3.6 3.8-5.8 7.5-5.8s6.7 2.2 7.5 5.8" />
    </svg>
  );
}

export function ProfileMenu({ profile }: { profile: AepsProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close when the route changes.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    // Delete the server-side session cookie (stored credentials); go to login even if it fails.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    clearDemoSession();
    router.push("/login");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Open profile"
        className={cn(
          "flex items-center gap-2 rounded-full p-1 pr-2.5 transition-colors hover:bg-brand-light",
          open && "bg-brand-light",
        )}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-white shadow-md shadow-brand-primary/25">
          <UserIcon className="h-5 w-5" />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-status-success" aria-hidden="true" />
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 10 6"
          fill="none"
          aria-hidden="true"
          className={cn("text-text-secondary transition-transform duration-200", open && "rotate-180")}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Profile and balances"
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-80 animate-dialog-in overflow-hidden rounded-2xl border border-brand-border bg-white shadow-2xl shadow-brand-navy/15"
        >
          <div className="relative bg-brand-gradient px-5 pb-5 pt-4 text-white">
            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/40">
                <UserIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-white/70">Logged in as</p>
                <p className="truncate font-semibold tracking-wide">{profile.userName}</p>
              </div>
            </div>
            <div className="relative mt-4">
              <p className="text-xs text-white/70">Total balance</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight">{formatInr(profile.balance)}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 p-3">
            {balanceRows.map((row, index) => (
              <div
                key={row.key}
                className={cn(
                  "rounded-xl border border-brand-border bg-brand-light/50 px-3 py-2.5",
                  // An odd last tile spans both columns instead of leaving a gap.
                  index === balanceRows.length - 1 && balanceRows.length % 2 === 1 && "col-span-2",
                )}
              >
                <dt className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-text-primary">{formatInr(profile[row.key])}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-brand-border p-2">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
