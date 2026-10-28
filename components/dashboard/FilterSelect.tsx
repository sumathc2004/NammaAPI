"use client";

import { cn } from "@/lib/cn";

export type FilterOption = {
  id: string;
  label: string;
  /** Shown as "Label (count)". */
  count?: number | null;
  /** Needs attention when its count is above zero (e.g. "To check", "Failed"). */
  alert?: boolean;
  /** Heading of a group of options (consecutive options with the same `group` share one heading). */
  group?: string;
};

/**
 * A compact dropdown for filtering a list — the one-line replacement for a row of tabs in the
 * narrow dashboard panels. Each option shows its count; while an `alert` option has entries and
 * isn't the one chosen, a red dot on the control says there's something to look at, and choosing
 * it turns the control red.
 */
export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const current = options.find((option) => option.id === value);
  const hasAlert = (option: FilterOption | undefined) => !!option?.alert && (option.count ?? 0) > 0;
  const unseenAlert = !hasAlert(current) && options.some(hasAlert);

  const renderOption = (option: FilterOption) => (
    <option key={option.id} value={option.id}>
      {option.label}
      {option.count != null ? ` (${option.count.toLocaleString("en-IN")})` : ""}
    </option>
  );
  // Consecutive options with the same `group` go under one <optgroup> heading; the rest stay plain.
  const sections: { group?: string; options: FilterOption[] }[] = [];
  for (const option of options) {
    const last = sections[sections.length - 1];
    if (last && last.group === option.group) last.options.push(option);
    else sections.push({ group: option.group, options: [option] });
  }

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title={label}
        className={cn(
          "h-9 w-full appearance-none truncate rounded-lg border bg-white pl-2.5 pr-7 text-sm font-medium transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15 disabled:bg-brand-light/50 disabled:text-text-secondary",
          hasAlert(current) ? "border-status-failed/60 text-status-failed" : "border-brand-border text-text-primary",
        )}
      >
        {sections.map((section, i) =>
          section.group ? (
            <optgroup key={`${section.group}-${i}`} label={section.group}>
              {section.options.map(renderOption)}
            </optgroup>
          ) : (
            section.options.map(renderOption)
          ),
        )}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      {unseenAlert && (
        <span
          className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-status-failed"
          title="Some entries need attention"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
