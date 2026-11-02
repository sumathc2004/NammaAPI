import { cn } from "@/lib/cn";

export type StatusTone = "success" | "pending" | "failed" | "info" | "neutral";

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  success: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  pending: { pill: "bg-amber-50 text-amber-700 ring-amber-600/25", dot: "bg-amber-500" },
  failed: { pill: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  info: { pill: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  neutral: { pill: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
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

/** The status in the compact rows of the admin panels: a small tinted pill (green success, amber pending / in queue, red failed, blue refunded). */
export function StatusText({ children, tone, title, className }: { children: string; tone?: StatusTone; title?: string; className?: string }) {
  const colors = TONES[tone ?? statusTone(children)];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        colors.pill,
        className,
      )}
      title={title}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", colors.dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

/**
 * Background for a whole row by its status, with a coloured left edge: success green, pending / in queue amber,
 * failed (or `flagged`, e.g. a tally problem) red, refunded blue; anything else stays plain.
 */
export function rowTint(status: string, flagged = false): string {
  const tone = flagged ? "failed" : statusTone(status);
  if (tone === "success") return "bg-emerald-50/70 shadow-[inset_3px_0_0_0_#34d399] hover:bg-emerald-100/50";
  if (tone === "pending") return "bg-amber-50 shadow-[inset_3px_0_0_0_#fbbf24] hover:bg-amber-100/60";
  if (tone === "failed") return "bg-red-50/70 shadow-[inset_3px_0_0_0_#f87171]";
  if (tone === "info") return "bg-sky-50/70 shadow-[inset_3px_0_0_0_#38bdf8] hover:bg-sky-100/50";
  return "";
}
