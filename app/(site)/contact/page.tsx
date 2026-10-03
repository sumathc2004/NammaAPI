import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "./ContactForm";

export const metadata = buildMetadata({
  title: "Contact Sales",
  description: "Talk to the NammaAPI payments team about payouts, payment collection, salary processing and bulk payments.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact Sales"
        title="Talk to Our Payments Team"
        description="Tell us about your business and we'll get back to you with the right products and next steps."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
