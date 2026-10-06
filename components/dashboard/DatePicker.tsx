"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { toIsoDate } from "@/lib/reports/dates";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_FORMAT = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });

// All dates are ISO "yyyy-MM-dd" strings in local time; they compare correctly as strings.
function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(iso: string, days: number): string {
  const date = parseIso(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
function monthOf(iso: string): Date {
  const date = parseIso(iso);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(month: Date, count: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + count, 1);
}

/** "06 Oct 2026" */
export function formatDay(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Day cells for a month grid, Monday first; null pads the first week. */
function monthCells(month: Date): (string | null)[] {
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(new Date(month.getFullYear(), month.getMonth(), day)));
  }
  return cells;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

type DatePickerProps = {
  /** Shown inside the button, e.g. "From" / "To". */
  label: string;
  value: string;
  /** Earliest selectable day, if any. */
  min?: string;
  /** Latest selectable day. */
  max: string;
  onChange: (iso: string) => void;
  /** Which edge of the button the calendar lines up with (tablet and up). */
  align?: "left" | "right";
  className?: string;
};

/** Branded single-date picker; replaces the browser's native date popup, which can't be styled. */
export function DatePicker({ label, value, min, max, onChange, align = "left", className }: DatePickerProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(() => monthOf(value));

  const today = toIsoDate(new Date());
  const isDisabled = (iso: string) => iso > max || (min !== undefined && iso < min);
  const canGoBack = min === undefined || addMonths(view, -1) >= monthOf(min);
  const canGoForward = addMonths(view, 1) <= monthOf(max);

  function close(returnFocus = false) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function select(iso: string) {
    onChange(iso);
    close(true);
  }

  /** Focuses a day button, switching the visible month first if needed. */
  function focusDay(iso: string, retry = true) {
    const button = panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`);
    if (button) {
      button.focus();
    } else if (retry) {
      setView(monthOf(iso));
      requestAnimationFrame(() => focusDay(iso, false));
    }
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => focusDay(value));
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the calendar opens
  }, [open]);

  function handleDayKeyDown(e: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const target = addDays(iso, step);
    if (!isDisabled(target)) focusDay(target);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (open) return close();
          setView(monthOf(value));
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label} date, ${formatDay(value)}`}
        className={cn(
          "inline-flex h-9 w-full items-center gap-2 rounded-lg border bg-white px-3 text-sm transition-colors",
          open ? "border-brand-primary ring-2 ring-brand-primary/15" : "border-brand-border hover:border-brand-primary",
        )}
      >
        <span className="hidden w-9 shrink-0 text-left text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:inline" aria-hidden="true">{label}</span>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left font-medium tabular-nums text-text-primary">{formatDay(value)}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-brand-primary">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()} date`}
          // Phones: centred under the navbar. Tablet and up: a dropdown under the button.
          className={cn(
            "fixed left-1/2 top-20 z-50 w-max -translate-x-1/2 animate-dialog-in rounded-2xl border border-brand-border bg-white p-3 shadow-2xl shadow-brand-navy/15",
            "sm:absolute sm:top-full sm:mt-2 sm:translate-x-0",
            align === "right" ? "sm:left-auto sm:right-0" : "sm:left-0",
          )}
        >
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setView(addMonths(view, -1))}
              disabled={!canGoBack}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-light hover:text-brand-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <Chevron direction="left" />
            </button>
            <p className="text-sm font-semibold text-text-primary" aria-live="polite">
              {MONTH_FORMAT.format(view)}
            </p>
            <button
              type="button"
              onClick={() => setView(addMonths(view, 1))}
              disabled={!canGoForward}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-brand-light hover:text-brand-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <Chevron direction="right" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <span key={day} className="flex h-8 w-10 items-center justify-center text-[11px] font-semibold uppercase text-text-secondary">
                {day}
              </span>
            ))}
            {monthCells(view).map((iso, i) => {
              if (!iso) return <span key={`pad-${i}`} aria-hidden="true" />;
              const disabled = isDisabled(iso);
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  disabled={disabled}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(iso)}
                  onKeyDown={(e) => handleDayKeyDown(e, iso)}
                  aria-pressed={selected}
                  aria-label={parseIso(iso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  className={cn(
                    "relative mx-auto my-0.5 flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary/40",
                    selected
                      ? "bg-brand-primary font-semibold text-white shadow-md shadow-brand-primary/30"
                      : disabled
                        ? "cursor-not-allowed text-text-secondary/30"
                        : "text-text-primary hover:bg-brand-light",
                    isToday && !selected && "font-semibold text-brand-primary",
                  )}
                >
                  {Number(iso.slice(8))}
                  {isToday && !selected && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-primary" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {!isDisabled(today) && (
            <div className="mt-2 border-t border-brand-border pt-2 text-center">
              <button
                type="button"
                onClick={() => select(today)}
                className="rounded-md px-3 py-1 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-light"
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
