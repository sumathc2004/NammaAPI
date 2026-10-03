import type { AepsProfile } from "@/lib/auth/demoSession";
import { cn } from "@/lib/cn";

/** "777" -> "₹777.00", "125000.5" -> "₹1,25,000.50"; "—" when missing. */
function formatRupees(value: string | undefined): string {
  const amount = Number((value ?? "").replace(/,/g, ""));
  if (!value || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

function ArrowCircle({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "up" ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
    </svg>
  );
}

function Segment({ label, value, direction }: { label: string; value: string | undefined; direction: "up" | "down" }) {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-brand-border",
          direction === "up" ? "text-brand-primary" : "text-brand-accent",
        )}
      >
        <ArrowCircle direction={direction} />
      </span>
      <div className="leading-none">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">{label}</p>
        <p className="mt-1 text-sm font-bold tabular-nums text-text-primary">{formatRupees(value)}</p>
      </div>
    </div>
  );
}

/** Debit (main wallet) and credit wallet balances for the dashboard navbar. Values are from login. */
export function WalletBalances({ profile, className }: { profile: AepsProfile; className?: string }) {
  return (
    <div
      role="group"
      aria-label="Wallet balances"
      className={cn(
        "flex h-12 items-center divide-x divide-brand-border rounded-xl border border-brand-border bg-brand-light/60",
        className,
      )}
    >
      <Segment label="Debit balance" value={profile.walletBalance} direction="up" />
      <Segment label="Credit balance" value={profile.creditBalance} direction="down" />
    </div>
  );
}
