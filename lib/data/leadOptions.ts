// Option lists shared by the Contact and Signup forms and by server-side validation,
// so the values a form can submit are exactly the values the API accepts.

export type Option = { value: string; label: string };

export const businessTypeOptions: Option[] = [
  { value: "college", label: "College / Educational Institution" },
  { value: "travel", label: "Travel Company" },
  { value: "insurance", label: "Insurance Business" },
  { value: "ca-firm", label: "CA Firm" },
  { value: "corporate", label: "Corporate / Enterprise" },
  { value: "startup", label: "Startup / Technology Platform" },
  { value: "grocery", label: "Grocery / Retail Store" },
  { value: "other", label: "Other" },
];

export const monthlyVolumeOptions: Option[] = [
  { value: "lt-10l", label: "Less than ₹10 lakh" },
  { value: "10l-1cr", label: "₹10 lakh – ₹1 crore" },
  { value: "1cr-10cr", label: "₹1 crore – ₹10 crore" },
  { value: "gt-10cr", label: "More than ₹10 crore" },
];

export const serviceOptions = [
  "Payout API",
  "Payment Gateway / Collection",
  "Salary & Bulk Payments",
  "Payment Automation",
];

export function optionLabel(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
