import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { IndustryCard } from "@/components/sections/IndustryCard";
import { FinalCta } from "@/components/sections/FinalCta";
import { industries } from "@/lib/data/industries";

export const metadata = buildMetadata({
  title: "Industry Solutions — Payments Built for Your Business",
  description:
    "Payment infrastructure configured for colleges, travel businesses, insurance companies, CA firms, corporates and startups.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Industry Solutions"
        title="Built Around Your Business"
        description="The same reliable payment infrastructure, configured for how your industry actually operates."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => (
              <IndustryCard key={industry.id} industry={industry} />
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
