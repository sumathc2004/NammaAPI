import { buildMetadata } from "@/lib/metadata";
import { LegalLayout } from "@/components/sections/LegalLayout";

export const metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "Terms and conditions governing use of the NammaAPI platform.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" lastUpdated="[Insert date]">
      <p>
        This page is a placeholder for NammaAPI&apos;s Terms &amp; Conditions. Replace this content with your
        finalized, legally reviewed terms before this site goes live.
      </p>
      <div>
        <h2 className="text-base font-semibold text-text-primary">1. Acceptance of Terms</h2>
        <p className="mt-2">[Insert terms describing how use of the platform constitutes acceptance.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">2. Use of the Platform</h2>
        <p className="mt-2">[Insert permitted and prohibited uses of the API and dashboard.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">3. Fees & Payment</h2>
        <p className="mt-2">[Insert fee structure references or link to the Pricing page.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">4. Liability</h2>
        <p className="mt-2">[Insert limitation of liability terms.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">5. Governing Law</h2>
        <p className="mt-2">[Insert applicable jurisdiction and governing law.]</p>
      </div>
    </LegalLayout>
  );
}
