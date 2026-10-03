// Sidebar sections of the logged-in dashboard, in display order. Each one has a page at
// /dashboard/<id> (app/dashboard/<id>/page.tsx); its icon lives in components/dashboard/SectionIcon.tsx.

export const dashboardSections = [
  {
    id: "transfer",
    label: "Transfer",
    description: "Send money to beneficiaries and track the status of every transfer.",
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
    adminOnly: true,
  },
] as const;

export type DashboardSection = (typeof dashboardSections)[number];
export type DashboardSectionId = DashboardSection["id"];

/** Sections shown only when the logged-in account is an admin (`isAdmin` from login). */
export function isAdminOnly(section: DashboardSection): boolean {
  return "adminOnly" in section && section.adminOnly;
}

export const DEFAULT_DASHBOARD_PATH = `/dashboard/${dashboardSections[0].id}`;

export function dashboardPath(id: DashboardSectionId): string {
  return `/dashboard/${id}`;
}

export function getDashboardSection(id: DashboardSectionId): DashboardSection {
  return dashboardSections.find((s) => s.id === id)!;
}
