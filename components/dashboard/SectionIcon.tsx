import type { ReactNode } from "react";
import type { DashboardSectionId } from "@/lib/data/dashboardNav";

// Stroke icons on a 24×24 grid. `satisfies` makes a section without an icon a type error.
const paths = {
  transfer: (
    <>
      <path d="M4 8h14l-3.5-3.5" />
      <path d="M20 16H6l3.5 3.5" />
    </>
  ),
  "pg-reports": (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 14.5h4" />
    </>
  ),
  "aeps-reports": (
    <>
      <path d="M12 11.5v2.5a7 7 0 0 1-1.4 4.2" />
      <path d="M8.6 8.6A4.8 4.8 0 0 1 16.8 12c0 1.7-.2 3.3-.7 4.8" />
      <path d="M6.2 13.5a6.8 6.8 0 0 1 .5-4.2M9 3.9a8 8 0 0 1 10.8 7.4c0 .9 0 1.8-.1 2.7" />
      <path d="M8.9 15.6a5 5 0 0 1-.9 2.4M14.8 18.6c-.3.8-.7 1.5-1.1 2.2" />
    </>
  ),
  "qr-reports": (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 20h1.5M20 14v1.5" />
    </>
  ),
  "wallet-ledger": (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3" />
      <path d="M4 7.5v10A1.5 1.5 0 0 0 5.5 19H20V8H6.5A2.5 2.5 0 0 1 4 5.5" />
      <path d="M16 13.5h.01" />
    </>
  ),
  "credit-ledger": (
    <>
      <path d="M5.5 4.5A1.5 1.5 0 0 1 7 3h12v15H7a1.5 1.5 0 0 0-1.5 1.5v-15Z" />
      <path d="M5.5 19.5A1.5 1.5 0 0 0 7 21h12M9.5 7.5h6M9.5 11h6" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3L19 6V11C19 15.5 16 19.3 12 20.5C8 19.3 5 15.5 5 11V6L12 3Z" />
      <circle cx="12" cy="10" r="2.2" />
      <path d="M8.6 15.6c.7-1.5 1.9-2.3 3.4-2.3s2.7.8 3.4 2.3" />
    </>
  ),
} satisfies Record<DashboardSectionId, ReactNode>;

export function SectionIcon({ id, className }: { id: DashboardSectionId; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[id]}
    </svg>
  );
}
