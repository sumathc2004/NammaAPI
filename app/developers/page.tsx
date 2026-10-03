import { buildMetadata } from "@/lib/metadata";
import { DocsSidebar } from "@/components/sections/DocsSidebar";
import { ApiEndpoint } from "@/components/ui/ApiEndpoint";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { apiEndpoints, docsStubSections } from "@/lib/data/apiEndpoints";

export const metadata = buildMetadata({
  title: "API Documentation — Developers",
  description:
    "Reference documentation for the NammaAPI Payout, Payment, Beneficiary, Transaction Status and Webhook APIs, with cURL, C#, JavaScript and Python examples.",
  path: "/developers",
});

const stubIds = ["salary-api", "bulk-payments", "reconciliation", "reports", "errors", "rate-limits", "changelog"];

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Developers</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-text-primary">API Documentation</h1>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Reference for the Payout, Payment, Beneficiary, Transaction Status and Webhook APIs. All examples on this
          page use sample/demo data and are not live endpoints.
        </p>
      </div>

      <div className="mb-8 -mx-4 overflow-x-auto px-4 lg:hidden">
        <DocsSidebar className="flex w-max gap-1 whitespace-nowrap [&_ul]:flex [&_ul]:gap-1 [&_ul]:space-y-0" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <DocsSidebar className="hidden lg:sticky lg:top-24 lg:block lg:h-fit" />

        <div className="min-w-0">
          <section id="getting-started" className="scroll-mt-28 border-b border-brand-border pb-12">
            <h2 className="text-2xl font-bold text-text-primary">Getting Started</h2>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Create a business account, generate an API key from your dashboard, and start making requests
              against the sandbox environment. All base URLs shown on this page (
              <code className="rounded bg-brand-light px-1.5 py-0.5 font-mono text-xs">api.example.com</code>) are
              placeholders for illustration.
            </p>
          </section>

          <section id="authentication" className="scroll-mt-28 border-b border-brand-border py-12">
            <h2 className="text-2xl font-bold text-text-primary">Authentication</h2>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Every request must include your API key as a bearer token. Keys are generated and managed from your
              dashboard and should never be exposed in frontend code.
            </p>
            <div className="mt-5 max-w-xl">
              <CodeBlock code={`Authorization: Bearer YOUR_API_KEY`} label="header" />
            </div>
          </section>

          <section id="sandbox" className="scroll-mt-28 border-b border-brand-border py-12">
            <h2 className="text-2xl font-bold text-text-primary">Sandbox</h2>
            <p className="mt-3 max-w-2xl text-text-secondary">
              Sandbox API keys let you integrate and test end-to-end flows without moving real funds. Sandbox and
              production environments use separate credentials and are fully isolated from each other.
            </p>
          </section>

          {apiEndpoints.map((endpoint) => (
            <ApiEndpoint key={endpoint.id} endpoint={endpoint} />
          ))}

          {docsStubSections.map((section, i) => (
            <section key={section.title} id={stubIds[i]} className="scroll-mt-28 border-b border-brand-border py-12 last:border-b-0">
              <h2 className="text-2xl font-bold text-text-primary">{section.title}</h2>
              <p className="mt-3 max-w-2xl text-text-secondary">{section.description}</p>
              <p className="mt-4 inline-block rounded-full border border-brand-border bg-brand-light px-3 py-1 text-xs font-medium text-text-secondary">
                Detailed reference coming soon
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
