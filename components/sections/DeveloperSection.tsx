import { SectionHeading } from "@/components/ui/SectionHeading";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Button } from "@/components/ui/Button";

const capabilities = [
  "REST APIs",
  "API Keys",
  "Sandbox",
  "Webhooks",
  "Transaction APIs",
  "Status APIs",
  "Beneficiary APIs",
  "Reconciliation APIs",
  "Reporting APIs",
  "Error Handling",
];

const requestSample = `POST /api/v1/payout

{
  "amount": 50000,
  "beneficiaryId": "demo-beneficiary",
  "reference": "demo-reference"
}`;

const responseSample = `{
  "transactionId": "demo-transaction-id",
  "status": "PROCESSING"
}`;

export function DeveloperSection() {
  return (
    <section className="relative overflow-hidden bg-brand-navy py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-dot-grid-light" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand-accent/15 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For Developers"
          title="One API. Multiple Business Workflows."
          description="A consistent, predictable API surface across payouts, payments, salary and reconciliation."
          light
        />

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/developers" variant="primary" size="md">
                Read API Documentation
              </Button>
              <Button href="/signup" variant="outline" size="md">
                Start Integration
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-mono text-xs text-white/45">Sample request — demo data, not a live endpoint</p>
            <CodeBlock code={requestSample} label="request" />
            <CodeBlock code={responseSample} label="response" />
          </div>
        </div>
      </div>
    </section>
  );
}
