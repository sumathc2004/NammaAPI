import { buildMetadata } from "@/lib/metadata";
import { LegalLayout } from "@/components/sections/LegalLayout";

export const metadata = buildMetadata({
  title: "Refund & Cancellation Policy",
  description: "Refund and cancellation policy for NammaAPI services.",
  path: "/legal/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" lastUpdated="[Insert date]">
      <p>
        This page is a placeholder for NammaAPI&apos;s Refund &amp; Cancellation Policy. Replace this content with
        your finalized, legally reviewed policy before this site goes live.
      </p>
      <div>
        <h2 className="text-base font-semibold text-text-primary">1. Service Cancellation</h2>
        <p className="mt-2">[Insert terms for how a business account or subscription may be cancelled.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">2. Refunds</h2>
        <p className="mt-2">[Insert applicable refund conditions for platform fees, if any.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">3. Transaction-Level Refunds</h2>
        <p className="mt-2">
          [Insert how end-customer transaction refunds initiated through the Payment Gateway / Collection API are
          handled.]
        </p>
      </div>
    </LegalLayout>
  );
}
