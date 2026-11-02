import { cn } from "@/lib/cn";

/**
 * The first column of the admin panels' rows: an optional tag above the time (the BUL account, the settlement
 * type, the vendor), an optional muted line (the shop, in blue italics), the time, and the date when it isn't today.
 */
export function RowTime({
  time,
  day,
  label,
  sub,
  className,
}: {
  time: string;
  day?: string;
  label?: string;
  sub?: string;
  className?: string;
}) {
  return (
    <span className={cn("min-w-0 tabular-nums", className)}>
      {label && (
        <span
          className="mb-0.5 block w-fit max-w-full truncate rounded-md bg-brand-light px-1.5 text-[10px] font-semibold leading-4 text-brand-navy"
          title={label}
        >
          {label}
        </span>
      )}
      {sub && (
        <span className="block truncate text-[11.5px] font-medium italic leading-4 tracking-wide text-brand-primary" title={sub}>
          {sub}
        </span>
      )}
      <span className="block whitespace-nowrap text-[13px] font-semibold leading-5 text-text-primary">{time}</span>
      {day && <span className="block text-[11px] leading-4 text-text-secondary">{day}</span>}
    </span>
  );
}
