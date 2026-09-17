import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MarqueeItem = {
  id: string;
  label: string;
  /** Short product/service line shown under the label, e.g. "Ticket Payment API". */
  tagline?: string;
  description: string;
  tags?: string[];
  href: string;
  icon: ReactNode;
};

type MarqueeProps = {
  items: MarqueeItem[];
  eyebrow?: string;
  dark?: boolean;
  reverse?: boolean;
  /** Render as a bare full-bleed block instead of a bordered white section (use when the parent already provides the section chrome, e.g. inside Hero). */
  bare?: boolean;
};

const headerVariants = [
  "bg-gradient-to-br from-brand-navy to-brand-primary",
  "bg-gradient-to-tr from-brand-accent to-brand-primary",
  "bg-gradient-to-br from-brand-primary via-brand-accent to-brand-dark",
  "bg-gradient-to-b from-brand-dark to-brand-accent",
  "bg-gradient-to-tr from-brand-navy via-brand-primary to-brand-accent",
  "bg-gradient-to-br from-brand-accent to-brand-navy",
];

const darkHeaderVariants = [
  "bg-gradient-to-br from-brand-accent/60 to-brand-primary/20",
  "bg-gradient-to-tr from-brand-primary/60 to-brand-accent/20",
  "bg-gradient-to-br from-brand-dark/70 via-brand-primary/40 to-transparent",
  "bg-gradient-to-b from-brand-accent/50 via-brand-primary/50 to-brand-dark/30",
  "bg-gradient-to-tr from-brand-navy/70 to-brand-accent/40",
  "bg-gradient-to-br from-brand-primary/50 to-brand-navy/50",
];

export function Marquee({ items, eyebrow, dark = false, reverse = false, bare = false }: MarqueeProps) {
  const doubled = [...items, ...items];
  const variantCount = headerVariants.length;

  const track = (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
      }}
    >
      <div className={cn("marquee-track flex w-max animate-marquee gap-7 py-1", reverse && "marquee-reverse")}>
        {doubled.map((item, i) => (
          <Link
            key={`${item.id}-${i}`}
            href={item.href}
            className={cn(
              "group flex w-[26rem] shrink-0 flex-col overflow-hidden rounded-2xl border transition-all duration-300",
              dark
                ? "border-white/15 bg-white/5 hover:border-white/35 hover:shadow-xl hover:shadow-brand-accent/10"
                : "border-brand-border bg-white shadow-sm hover:-translate-y-1 hover:border-brand-primary/50 hover:shadow-xl hover:shadow-brand-primary/15",
            )}
          >
            <div
              className={cn(
                "relative flex h-48 items-center justify-center overflow-hidden",
                dark ? darkHeaderVariants[i % variantCount] : headerVariants[i % variantCount],
              )}
            >
              <div className="absolute inset-0 bg-dot-grid-light opacity-50" aria-hidden="true" />
              <div
                className="absolute h-32 w-32 rounded-full bg-white/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                aria-hidden="true"
              />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  {item.icon}
                </svg>
              </span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <p className={dark ? "text-lg font-semibold text-white" : "text-lg font-semibold text-text-primary"}>{item.label}</p>
              {item.tagline && (
                <p className={cn("mt-0.5 text-sm font-medium", dark ? "text-brand-accent" : "text-brand-primary")}>{item.tagline}</p>
              )}
              <p className={cn("mt-2 line-clamp-3 text-sm leading-relaxed", dark ? "text-white/65" : "text-text-secondary")}>
                {item.description}
              </p>

              {item.tags && item.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        dark ? "border-white/15 bg-white/5 text-white/70" : "border-brand-border bg-brand-light text-text-secondary",
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <span
                className={cn(
                  "mt-auto flex items-center gap-1 pt-5 text-sm font-semibold",
                  dark ? "text-white" : "text-brand-primary",
                )}
              >
                Explore
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  const eyebrowEl = eyebrow && (
    <p className={cn("text-center text-xs font-semibold uppercase tracking-wide", dark ? "text-white/60" : "text-text-secondary")}>
      {eyebrow}
    </p>
  );

  if (bare) {
    return (
      <div>
        {eyebrowEl}
        <div className={eyebrow ? "mt-5" : ""}>{track}</div>
      </div>
    );
  }

  return (
    <section className="border-y border-brand-border bg-white py-10">
      {eyebrowEl && <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">{eyebrowEl}</div>}
      <div className={eyebrow ? "mt-6" : ""}>{track}</div>
    </section>
  );
}
