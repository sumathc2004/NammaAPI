import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-brand-border bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{children}</p>
    </div>
  );
}
