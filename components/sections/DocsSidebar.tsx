import Link from "next/link";
import { cn } from "@/lib/cn";

export type DocsSidebarSection = {
  id: string;
  label: string;
};

const sections: DocsSidebarSection[] = [
  { id: "getting-started", label: "Getting Started" },
  { id: "authentication", label: "Authentication" },
  { id: "sandbox", label: "Sandbox" },
  { id: "status", label: "API Status" },
  { id: "create-payout", label: "Payout API" },
  { id: "create-payment", label: "Payment API" },
  { id: "add-beneficiary", label: "Beneficiary API" },
  { id: "transaction-status", label: "Transaction Status" },
  { id: "webhooks", label: "Webhooks" },
  { id: "salary-api", label: "Salary API" },
  { id: "bulk-payments", label: "Bulk Payments" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "reports", label: "Reports" },
  { id: "errors", label: "Errors" },
  { id: "rate-limits", label: "Rate Limits" },
  { id: "changelog", label: "Changelog" },
];

export function DocsSidebar({ className }: { className?: string }) {
  return (
    <nav aria-label="API documentation" className={cn("text-sm", className)}>
      <ul className="space-y-0.5">
        {sections.map((s) => (
          <li key={s.id}>
            <Link
              href={`#${s.id}`}
              className="block rounded-md px-3 py-1.5 text-text-secondary transition-colors hover:bg-brand-light hover:text-brand-primary"
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { sections as docsSidebarSections };
