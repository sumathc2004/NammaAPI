// Sidebar sections of the logged-in dashboard, in display order. Each one has a page at
// /dashboard/<id> (app/dashboard/<id>/page.tsx); its icon lives in components/dashboard/SectionIcon.tsx.

import type { PageRole } from "@/lib/auth/adminAccess";

export const dashboardSections = [
  {
    id: "transfer",
    label: "Transfer Reports",
    description: "Every transfer to a beneficiary, with its status, UTR and refunds.",
  },
  {
    id: "pg-reports",
    label: "PG Reports",
    description: "Payment gateway collections and settlement reports.",
  },
  {
    id: "aeps-reports",
    label: "AEPS Reports",
    description: "Aadhaar-enabled payment transactions such as cash withdrawals and balance enquiries.",
  },
  {
    id: "qr-reports",
    label: "QR Reports",
    description: "Payments received through your QR codes.",
  },
  {
    id: "bill-payments",
    label: "Bill Payments",
    description: "Electricity, mobile, DTH and other bill payments made from your account.",
  },
  {
    id: "wallet-ledger",
    label: "Wallet Ledger",
    description: "Every credit and debit on your wallet balance.",
  },
  {
    id: "credit-ledger",
    label: "Credit Ledger",
    description: "Credit entries and adjustments on your account.",
  },
  {
    id: "admin",
    label: "Admin",
    description: "Administrator tools for managing the platform.",
    role: "admin",
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Platform balances, today's totals and the PG tally, for accountants.",
    role: "accountant",
  },
  {
    id: "filing",
    label: "Filing",
    description: "Monthly invoices for filing, for admins and accountants.",
    role: "adminOrAccountant",
  },
  {
    id: "super-access",
    label: "Super Access",
    description: "BUL account balances and the PG tally.",
    role: "superAccess",
  },
] as const;

export type DashboardSection = (typeof dashboardSections)[number];
export type DashboardSectionId = DashboardSection["id"];

/** The role a section is limited to (`isAdmin`, `isAccountant` or `isSuperAccess` from login), or null for everyone. */
export function sectionRole(section: DashboardSection): PageRole | null {
  return "role" in section ? section.role : null;
}

/** Sections shown only to accounts with a role. */
export function isRoleOnly(section: DashboardSection): boolean {
  return sectionRole(section) !== null;
}

export const DEFAULT_DASHBOARD_PATH = `/dashboard/${dashboardSections[0].id}`;

export function dashboardPath(id: DashboardSectionId): string {
  return `/dashboard/${id}`;
}

export function getDashboardSection(id: DashboardSectionId): DashboardSection {
  return dashboardSections.find((s) => s.id === id)!;
}
