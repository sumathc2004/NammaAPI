import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { Card } from "@/components/ui/Card";
import { FinalCta } from "@/components/sections/FinalCta";

export const metadata = buildMetadata({
  title: "About Us",
  description: "NammaAPI builds payment infrastructure and APIs for businesses across India.",
  path: "/about",
});

const values = [
  {
    title: "Reliability",
    description: "Payment infrastructure businesses can depend on for critical financial operations.",
  },
  {
    title: "Transparency",
    description: "Clear documentation, predictable APIs and honest communication about what the platform does.",
  },
  {
    title: "Developer-First",
    description: "Built by people who integrate APIs for a living, for the teams that will integrate ours.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="Payment Infrastructure for Modern Businesses"
        description="[Placeholder] NammaAPI was founded to help Indian businesses automate payouts, collections and payroll through modern, reliable APIs — replacing manual, error-prone payment processes with connected infrastructure."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary">Our Mission</h2>
          <p className="mt-4 text-text-secondary">
            [Placeholder] Our mission is to give businesses of every size — from growing colleges and CA firms to
            large enterprises — access to the same reliable, API-driven payment infrastructure that modern
            technology platforms rely on. Replace this paragraph with your company&apos;s actual mission statement.
          </p>

          <h2 className="mt-14 text-2xl font-bold text-text-primary">What We Do</h2>
          <p className="mt-4 text-text-secondary">
            We provide Payout APIs, Payment Gateway / Collection APIs, salary and bulk payment processing, and
            automation tools that let businesses move money in and out through code instead of manual, offline
            processes.
          </p>
        </div>
      </section>

      <section className="bg-brand-light py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-text-primary">What We Value</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title}>
                <h3 className="text-base font-semibold text-text-primary">{v.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{v.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="careers" className="scroll-mt-28 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary">Careers</h2>
          <p className="mt-4 text-text-secondary">
            [Placeholder] Open roles will be listed here. In the meantime, reach out through our{" "}
            <Link href="/contact" className="font-semibold text-brand-primary hover:text-brand-dark">
              contact page
            </Link>{" "}
            if you&apos;d like to get in touch.
          </p>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
