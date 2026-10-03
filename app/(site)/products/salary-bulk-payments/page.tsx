import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { RelatedProducts } from "@/components/sections/RelatedProducts";
import { FinalCta } from "@/components/sections/FinalCta";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { getProduct } from "@/lib/data/products";

const product = getProduct("salary-bulk-payments")!;

export const metadata = buildMetadata({
  title: "Salary & Bulk Payments — Automate Payroll & Bulk Transfers",
  description: "Automate corporate salary and bulk payment processing with the NammaAPI platform.",
  path: "/products/salary-bulk-payments",
});

const flow = [
  "Create Batch",
  "Upload / Add Employees",
  "Validate",
  "Review",
  "Approve",
  "Process",
  "Reconcile",
];

const sample = `POST /api/v1/salary/batches

{
  "batchReference": "demo-payroll-sep",
  "items": [
    { "employeeId": "EMP-1001", "amount": 65000 },
    { "employeeId": "EMP-1002", "amount": 58000 }
  ]
}

// Response
{
  "batchId": "demo-batch-id",
  "status": "PENDING_APPROVAL",
  "itemCount": 2
}`;

export default function SalaryBulkPaymentsPage() {
  return (
    <>
      <PageHero eyebrow="Salary & Bulk Payments" title={product.name} description={product.description}>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button href="/signup" size="lg">
            Get Started
          </Button>
          <Button href="/developers#salary-api" variant="secondary" size="lg">
            View API Reference
          </Button>
        </div>
      </PageHero>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-text-primary">Batch Processing Flow</h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {flow.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-brand-border bg-brand-light px-4 py-2 text-sm font-medium text-text-primary">
                  {step}
                </span>
                {i < flow.length - 1 && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand-primary" aria-hidden="true">
                    <path d="M2 8H14M14 8L9.5 3.5M14 8L9.5 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-light py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1600px] gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">What you can build</h2>
            <ul className="mt-6 space-y-4">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-primary">
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
            <CodeBlock code={sample} label="salary-bulk-payments" />
          </div>
        </div>
      </section>

      <RelatedProducts currentSlug={product.slug} />
      <FinalCta />
    </>
  );
}
