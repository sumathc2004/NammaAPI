"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable (e.g. plain http on a LAN address): fall back to a hidden textarea.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** A small copy icon: copies `value` (the full code) and shows a tick for a moment. Safe inside clickable rows. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (await writeClipboard(value)) setCopied(true);
      }}
      onKeyDown={(event) => event.stopPropagation()}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}: ${value}`}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-brand-light hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary",
        copied && "text-status-success hover:text-status-success",
        className,
      )}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {copied ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
          </>
        )}
      </svg>
    </button>
  );
}
