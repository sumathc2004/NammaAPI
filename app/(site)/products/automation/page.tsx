import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { RelatedProducts } from "@/components/sections/RelatedProducts";
import { FinalCta } from "@/components/sections/FinalCta";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getProduct } from "@/lib/data/products";

const product = getProduct("automation")!;

export const metadata = buildMetadata({
  title: "Payment Automation — Automated Financial Workflows",
  description: "Build automated financial workflows using APIs and webhooks with NammaAPI.",
  path: "/products/automation",
});

const sample = `// Incoming webhook — demo event
POST https://yourapp.com/webhooks/payments

{
  "event": "transaction.status.updated",
  "transactionId": "demo-transaction-id",
  "status": "SUCCESS"
}`;

export default function AutomationPage() {
  return (
    <>
      <PageHero eyebrow="Payment Automation" title={product.name} description={product.description}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/signup" size="lg">
            Get Started
          </Button>
          <Button href="/developers#webhooks" variant="secondary" size="lg">
            View Webhook Docs
          </Button>
        </div>
      </PageHero>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">What you can build</h2>
            <ul className="mt-6 space-y-4">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-primary">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="font-semibold text-text-primary">{f}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Sample webhook event — demo data
            </p>
            <CodeBlock code={sample} label="webhook-event" />
          </div>
        </div>
      </section>

      <RelatedProducts currentSlug={product.slug} />
      <FinalCta />
    </>
  );
}
