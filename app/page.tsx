import { buildMetadata } from "@/lib/metadata";
import { Hero } from "@/components/sections/Hero";
import { TrustSection } from "@/components/sections/TrustSection";
import { ProductsSection } from "@/components/sections/ProductsSection";
import { IndustriesSection } from "@/components/sections/IndustriesSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { DeveloperSection } from "@/components/sections/DeveloperSection";
import { DashboardPreview } from "@/components/sections/DashboardPreview";
import { SecuritySection } from "@/components/sections/SecuritySection";
import { FinalCta } from "@/components/sections/FinalCta";

export const metadata = buildMetadata({
  title: "Business Payment APIs — Payouts, Payments & Salary Automation",
  description:
    "Automate business payouts, payment collection, salary processing and bulk payments with secure APIs and modern payment infrastructure.",
  path: "/",
});

export default function Home() {
  return (
    <>
      <Hero />
      <TrustSection />
      <ProductsSection />
      <IndustriesSection />
      <HowItWorks />
      <DeveloperSection />
      <DashboardPreview />
      <SecuritySection />
      <FinalCta />
    </>
  );
}
