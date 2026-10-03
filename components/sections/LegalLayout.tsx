import type { ReactNode } from "react";

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-text-secondary">Last updated: {lastUpdated} (placeholder)</p>
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-text-secondary">{children}</div>
      </div>
    </section>
  );
}
