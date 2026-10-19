import { CodeTabs } from "@/components/ui/CodeTabs";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Badge } from "@/components/ui/Badge";
import type { ApiEndpointDoc } from "@/lib/data/apiEndpoints";
import { cn } from "@/lib/cn";

const methodStyles: Record<string, string> = {
  GET: "bg-status-processing-bg text-status-processing",
  POST: "bg-status-success-bg text-status-success",
  PUT: "bg-amber-50 text-amber-700",
  DELETE: "bg-status-failed-bg text-status-failed",
};

export function ApiEndpoint({ endpoint }: { endpoint: ApiEndpointDoc }) {
  return (
    <section id={endpoint.id} className="scroll-mt-28 border-b border-brand-border py-12 first:pt-0 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-md px-2.5 py-1 font-mono text-xs font-bold",
            methodStyles[endpoint.method],
          )}
        >
          {endpoint.method}
        </span>
        <code className="rounded-md bg-brand-light px-2.5 py-1 font-mono text-sm text-text-primary">
          {endpoint.path}
        </code>
      </div>

      <h3 className="text-2xl font-bold text-text-primary">{endpoint.title}</h3>
      <p className="mt-2 max-w-2xl text-text-secondary">{endpoint.description}</p>

      {endpoint.requestFields && endpoint.requestFields.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-brand-light text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Required</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {endpoint.requestFields.map((field) => (
                <tr key={field.name}>
                  <td className="px-4 py-3 font-mono text-text-primary">{field.name}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{field.type}</td>
                  <td className="px-4 py-3">
                    {field.required ? (
                      <Badge className="border-brand-primary/30 bg-brand-primary/5 text-brand-primary">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-text-secondary">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{field.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Request — sample data
          </p>
          <CodeTabs samples={endpoint.codeSamples} />
        </div>
        <div className="space-y-6">
          {endpoint.requestExample && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Request body — sample data
              </p>
              <CodeBlock code={endpoint.requestExample} label="request.json" />
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Response — sample data
            </p>
            <CodeBlock code={endpoint.responseExample} label="response.json" />
          </div>
        </div>
      </div>

      {endpoint.errorCodes.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Error codes</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {endpoint.errorCodes.map((err) => (
              <li
                key={err.code}
                className="rounded-lg border border-brand-border bg-brand-light/60 px-3.5 py-2.5 text-sm"
              >
                <code className="font-mono font-semibold text-text-primary">{err.code}</code>
                <p className="mt-0.5 text-text-secondary">{err.meaning}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
