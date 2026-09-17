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
    description: "Simplify fee collection, refunds and institution payments through one connected API platform.",
    useCases: [
      "Student fee collection",
      "Online payment integration",
      "Refund processing",
      "Vendor payments",
      "Salary & staff payments",
      "Payment reconciliation",
    ],
  },
  {
    id: "travel",
    name: "Travel",
    tagline: "Ticket Payment API",
    audience: "For Travel Businesses",
    description:
      "Make ticket and travel payments easier with API-based payment collection and settlement workflows.",
    useCases: [
      "Ticket payment collection",
      "Booking payment integration",
      "Customer refunds",
      "Agent commissions",
      "Vendor payments",
      "Payment reconciliation",
    ],
  },
  {
    id: "insurance",
    name: "Insurance",
    audience: "For Insurance Businesses",
    description:
      "Simplify premium collections, customer payments and refund workflows through connected payment APIs.",
    useCases: [
      "Premium payment collection",
      "Customer payments",
      "Refund processing",
      "Partner payments",
      "Payment status tracking",
      "Transaction reconciliation",
    ],
    note: "Payment infrastructure only — this platform does not provide insurance underwriting, claims adjudication or other regulated insurance functions.",
  },
  {
    id: "ca-firms",
    name: "Chartered Accountants",
    audience: "For CA Firms & Financial Professionals",
    description: "Simplify client payment collection and business payment workflows through API-based infrastructure.",
    useCases: [
      "Client payment collection",
      "Fee collection",
      "Vendor payments",
      "Salary payments",
      "Payment tracking",
      "Reconciliation",
    ],
  },
  {
    id: "corporates",
    name: "Corporates",
    audience: "For Businesses & Enterprises",
    description:
      "Connect everyday business payments through APIs and simplify employee, vendor and operational payment workflows.",
    useCases: [
      "Vendor payments",
      "Employee salary payments",
      "Employee reimbursements",
      "Payment approvals",
      "Transaction tracking",
      "Reconciliation",
    ],
  },
  {
    id: "startups",
    name: "Startups & Platforms",
    audience: "For Technology Companies",
    description: "Embed payment collection and transaction workflows directly into your product using APIs.",
    useCases: [
      "Payment API integration",
      "Customer payment collection",
      "Payment status updates",
      "Refunds",
      "Webhooks",
      "Transaction reconciliation",
    ],
  },
  {
    id: "grocery",
    name: "Grocery",
    tagline: "QR & API Payments",
    audience: "For Grocery Stores & Retail Businesses",
    description: "Make everyday retail payments easier with QR and API-based payment solutions.",
    useCases: [
      "QR payment collection",
      "Supplier/vendor payments",
      "Refund processing",
      "Payment tracking",
      "Reconciliation",
    ],
  },
];
