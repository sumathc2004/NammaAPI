import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { RelatedProducts } from "@/components/sections/RelatedProducts";
import { FinalCta } from "@/components/sections/FinalCta";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getProduct } from "@/lib/data/products";

const product = getProduct("payment-gateway")!;

export const metadata = buildMetadata({
  title: "Payment Gateway / Collection API — Collect Payments With APIs",
  description: "Integrate payment collection into your business workflows with the NammaAPI Payment Gateway.",
  path: "/products/payment-gateway",
});

const sample = `POST /api/v1/payments

{
  "amount": 250000,
  "reference": "demo-order-reference",
  "methods": ["upi", "card", "netbanking"]
}

// Response
{
  "orderId": "demo-order-id",
  "status": "PENDING",
  "checkoutUrl": "https://pay.example.com/checkout/demo-order-id"
}`;

export default function PaymentGatewayPage() {
  return (
    <>
      <PageHero eyebrow="Payment Gateway / Collection API" title={product.name} description={product.description}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/signup" size="lg">
            Get Started
          </Button>
          <Button href="/developers#create-payment" variant="secondary" size="lg">
            View API Reference
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
              Sample request &amp; response — demo data
            </p>
            <CodeBlock code={sample} label="payment-gateway" />
          </div>
        </div>
      </section>

      <RelatedProducts currentSlug={product.slug} />
      <FinalCta />
    </>
  );
}
