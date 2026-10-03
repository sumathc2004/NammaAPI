import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { LegalLayout } from "@/components/sections/LegalLayout";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How NammaAPI collects, uses and protects information.",
  path: "/legal/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="[Insert date]">
      <p>
        This page is a placeholder for NammaAPI&apos;s Privacy Policy. Replace this content with your finalized,
        legally reviewed privacy policy before this site goes live.
      </p>
      <div>
        <h2 className="text-base font-semibold text-text-primary">1. Information We Collect</h2>
        <p className="mt-2">[Insert details of what business, contact and transaction information is collected.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">2. How We Use Information</h2>
        <p className="mt-2">[Insert details of how collected information is used to provide the service.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">3. Data Sharing</h2>
        <p className="mt-2">[Insert details of any third parties information may be shared with, and why.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">4. Data Security</h2>
        <p className="mt-2">[Insert details of security measures applied to stored and transmitted data.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">5. Contact</h2>
        <p className="mt-2">
          [Insert contact details for privacy-related inquiries.] You can also reach us through our{" "}
          <Link href="/contact" className="font-medium text-brand-primary hover:text-brand-dark">
            contact page
          </Link>
          .
        </p>
      </div>
    </LegalLayout>
  );
}
