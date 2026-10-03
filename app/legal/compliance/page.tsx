import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { LegalLayout } from "@/components/sections/LegalLayout";

export const metadata = buildMetadata({
  title: "Compliance",
  description: "Compliance information for the NammaAPI platform.",
  path: "/legal/compliance",
});

export default function CompliancePage() {
  return (
    <LegalLayout title="Compliance" lastUpdated="[Insert date]">
      <p>
        This page is a placeholder for verified regulatory, licensing and compliance information. NammaAPI does
        not claim any certification, license or regulatory approval that has not been independently verified. See
        also the{" "}
        <Link href="/security" className="font-medium text-brand-primary hover:text-brand-dark">
          Security &amp; Compliance
        </Link>{" "}
        product page for platform security capabilities.
      </p>
      <div>
        <h2 className="text-base font-semibold text-text-primary">Regulatory Registration</h2>
        <p className="mt-2">[Insert applicable regulatory registration or license details, once confirmed.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">Certifications</h2>
        <p className="mt-2">[Insert applicable security or compliance certifications, once obtained.]</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">Banking & Payment Partners</h2>
        <p className="mt-2">[Insert confirmed banking or payment-provider partnerships.]</p>
      </div>
    </LegalLayout>
  );
}
