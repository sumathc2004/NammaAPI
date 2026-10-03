export type NavLink = {
  label: string;
  href: string;
  description?: string;
};

export type NavItem = {
  label: string;
  href?: string;
  items?: NavLink[];
};

export const primaryNav: NavItem[] = [
  {
    label: "Products",
    href: "/products",
    items: [
      { label: "All Products", href: "/products", description: "Overview of the platform" },
      {
        label: "Payout API",
        href: "/products/payout-api",
        description: "Automate payments to employees, vendors and partners",
      },
      {
        label: "Payment Gateway",
        href: "/products/payment-gateway",
        description: "Collect payments across methods with one API",
      },
      {
        label: "Salary & Bulk Payments",
        href: "/products/salary-bulk-payments",
        description: "Process salary and bulk payments at scale",
      },
      {
        label: "Payment Automation",
        href: "/products/automation",
        description: "Build automated financial workflows",
      },
    ],
  },
  {
    label: "Solutions",
    href: "/solutions",
    items: [
      { label: "Education", href: "/solutions#education" },
      { label: "Travel", href: "/solutions#travel" },
      { label: "Insurance", href: "/solutions#insurance" },
      { label: "Chartered Accountants", href: "/solutions#ca-firms" },
      { label: "Corporates", href: "/solutions#corporates" },
      { label: "Startups & Platforms", href: "/solutions#startups" },
      { label: "Grocery", href: "/solutions#grocery" },
    ],
  },
  { label: "Developers", href: "/developers" },
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Company",
    items: [
      { label: "About Us", href: "/about" },
      { label: "Contact Sales", href: "/contact" },
    ],
  },
];

export const footerNav = {
  products: [
    { label: "Payout API", href: "/products/payout-api" },
    { label: "Payment Gateway", href: "/products/payment-gateway" },
    { label: "Salary Payments", href: "/products/salary-bulk-payments" },
    { label: "Bulk Payments", href: "/products/salary-bulk-payments" },
    { label: "Automation", href: "/products/automation" },
  ],
  solutions: [
    { label: "Education", href: "/solutions#education" },
    { label: "Travel", href: "/solutions#travel" },
    { label: "Insurance", href: "/solutions#insurance" },
    { label: "CA Firms", href: "/solutions#ca-firms" },
    { label: "Corporate", href: "/solutions#corporates" },
    { label: "Startups", href: "/solutions#startups" },
    { label: "Grocery", href: "/solutions#grocery" },
  ],
  developers: [
    { label: "API Documentation", href: "/developers" },
    { label: "Security", href: "/security" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "/about#careers" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms & Conditions", href: "/legal/terms" },
    { label: "Refund & Cancellation Policy", href: "/legal/refund-policy" },
    { label: "Compliance", href: "/legal/compliance" },
  ],
};
