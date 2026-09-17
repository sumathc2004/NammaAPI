export type Industry = {
  id: string;
  name: string;
  /** Short product/service tagline shown under the name in compact card views (e.g. the marquee). */
  tagline?: string;
  audience: string;
  description: string;
  useCases: string[];
  note?: string;
};

export const industries: Industry[] = [
  {
    id: "education",
    name: "Education",
    audience: "For Colleges & Educational Institutions",
    description:
      "Handle fee collection, refunds and campus vendor and payroll payments through one connected platform.",
    useCases: [
      "Fee collection",
      "Refund workflows",
      "Vendor payments",
      "Employee salaries",
      "Bulk payments",
      "Reconciliation",
    ],
  },
  {
    id: "travel",
    name: "Travel",
    tagline: "Ticket Payment API",
    audience: "For Travel Businesses",
    description: "API-based payment solutions for travel platforms and ticket booking systems.",
    useCases: [
      "Customer refunds",
      "Vendor payments",
      "Agent commissions",
      "Bulk payouts",
      "Payment collection",
      "Reconciliation",
    ],
  },
  {
    id: "insurance",
    name: "Insurance",
    audience: "For Insurance Businesses",
    description:
      "Process customer payments, claim refunds and partner payouts with clear transaction reporting.",
    useCases: [
      "Customer payments",
      "Refund processing",
      "Partner payments",
      "Bulk payouts",
      "Transaction reporting",
      "Reconciliation",
    ],
    note: "Payment infrastructure only — this platform does not provide insurance underwriting, claims adjudication or other regulated insurance functions.",
  },
  {
    id: "ca-firms",
    name: "Chartered Accountants",
    audience: "For CA Firms & Financial Professionals",
    description:
      "Run client payment workflows, vendor payments and payroll processing from a single dashboard.",
    useCases: [
      "Client payment workflows",
      "Vendor payments",
      "Salary processing",
      "Bulk transfers",
      "Reporting",
      "Reconciliation",
    ],
  },
  {
    id: "corporates",
    name: "Corporates",
    audience: "For Businesses & Enterprises",
    description:
      "Automate salary runs, vendor payments and employee reimbursements with full audit visibility.",
    useCases: [
      "Salary processing",
      "Vendor payments",
      "Employee reimbursements",
      "Bulk payouts",
      "Automated workflows",
      "Reporting",
    ],
  },
  {
    id: "startups",
    name: "Startups & Platforms",
    audience: "For Technology Companies",
    description:
      "Embed payments and payouts directly into your product with API-first infrastructure built for platforms.",
    useCases: [
      "API-based payments",
      "Automated payouts",
      "Partner settlements",
      "Marketplace workflows",
      "Payment collection",
      "Webhooks",
    ],
  },
  {
    id: "grocery",
    name: "Grocery",
    tagline: "QR & API Payments",
    audience: "For Grocery Stores & Retail Businesses",
    description: "Payment solutions for grocery stores and retail businesses using QR and API integration.",
    useCases: [
      "QR code collections",
      "Retail vendor payments",
      "Bulk payouts",
      "Reconciliation",
    ],
  },
];
