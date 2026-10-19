import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Settings" };

const businessTypeLabels: Record<string, string> = {
  college: "College / Educational Institution",
  travel: "Travel Company",
  insurance: "Insurance Business",
  "ca-firm": "CA Firm",
  corporate: "Corporate / Enterprise",
  startup: "Startup / Technology Platform",
  other: "Other",
};

export default async function SettingsPage() {
  // The layout has already verified the session; this call is deduplicated.
  const user = (await getCurrentUser())!;

  const details = [
    { label: "Company", value: user.companyName },
    { label: "Business email", value: user.email },
    { label: "Phone", value: user.phoneNumber },
    { label: "Business type", value: businessTypeLabels[user.businessType] ?? user.businessType },
    {
      label: "Member since",
      value: new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    },
  ];

  const np = user.nammaPayments;
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
  const money = (n: number | null) => (n === null ? null : inr.format(n));
  const npDetails = np
    ? [
        { label: "Username", value: np.userName },
        { label: "Total balance", value: money(np.balance) },
        { label: "Wallet balance", value: money(np.walletBalance) },
      ]
    : [];

  return (
    <>
      <PageHeader title="Settings" description="Your business and Namma Payments account details." />
      <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-text-primary">Business details</h2>
          <dl className="mt-4 divide-y divide-brand-border">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                <dt className="text-sm text-text-secondary">{d.label}</dt>
                <dd className="text-sm font-medium text-text-primary sm:text-right">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-text-primary">Namma Payments account</h2>
          {np ? (
            <dl className="mt-4 divide-y divide-brand-border">
              {npDetails.map((d) => (
                <div key={d.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
                  <dt className="text-sm text-text-secondary">{d.label}</dt>
                  <dd className={`text-sm font-medium sm:text-right ${d.value ? "text-text-primary" : "text-text-secondary"}`}>
                    {d.value ?? "Not available"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">
              Your Namma Payments details will appear here after your next login.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
