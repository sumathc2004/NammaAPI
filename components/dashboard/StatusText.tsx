import { cn } from "@/lib/cn";

export type StatusTone = "success" | "pending" | "failed" | "info" | "neutral";

const TONES: Record<StatusTone, string> = {
  success: "text-status-success",
  pending: "text-status-pending",
  failed: "text-status-failed",
  info: "text-brand-primary",
  neutral: "text-text-secondary",
};

/** Colour for a vendor status word ("Success", "In Queue", "Failed", "Refunded", ...). */
export function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (/fail|reject|declin|not credited|twice|not paid/.test(value)) return "failed";
  if (/success|complet|credited|paid/.test(value)) return "success";
  if (/pend|queue|process|wait|initiat/.test(value)) return "pending";
  if (/refund|dequeue/.test(value)) return "info";
  return "neutral";
}

/** A quiet status for the compact rows of the admin panels: a coloured dot and word, no filled badge. */
export function StatusText({ children, tone, title, className }: { children: string; tone?: StatusTone; title?: string; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide", TONES[tone ?? statusTone(children)], className)}
      title={title}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
