import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FinalCta } from "@/components/sections/FinalCta";
import { pricingPlans, pricingFactors } from "@/lib/data/pricing";
import { cn } from "@/lib/cn";

export const metadata = buildMetadata({
  title: "Pricing — Business Payment API Plans",
  description:
    "Starter, Growth and Enterprise plans for NammaAPI's payout, payment collection and salary processing APIs.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple Plans, Built Around Your Business"
        description="Pricing is tailored to your transaction volume, API usage and integration scope. Talk to our team for a plan that fits."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "flex flex-col",
                  plan.highlighted && "border-brand-primary shadow-lg shadow-brand-primary/10 ring-1 ring-brand-primary",
                )}
              >
                {plan.highlighted && (
                  <span className="mb-4 inline-flex w-fit items-center rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
                <p className="mt-2 text-sm text-text-secondary">{plan.tagline}</p>

                <p className="mt-6 text-3xl font-bold text-text-primary">{plan.price}</p>
                <p className="mt-1 text-xs text-text-secondary">{plan.priceNote}</p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-text-primary">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true">
                        <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  href="/contact"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  className="mt-8 w-full"
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-brand-border bg-brand-light p-8 text-center">
            <h2 className="text-lg font-bold text-text-primary">What affects your pricing?</h2>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {pricingFactors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
