import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/** Centered card shell shared by login, signup and password pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-brand-light px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-8 shadow-lg shadow-brand-navy/5 sm:p-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-2 text-center text-sm text-text-secondary">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function Notice({ tone, children }: { tone: "success" | "error" | "info"; children: ReactNode }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-brand-border bg-brand-light text-text-secondary",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
