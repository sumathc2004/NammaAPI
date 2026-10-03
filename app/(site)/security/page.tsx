import { buildMetadata } from "@/lib/metadata";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { FinalCta } from "@/components/sections/FinalCta";

export const metadata = buildMetadata({
  title: "Security & Compliance",
  description:
    "How NammaAPI's platform architecture is designed to support authentication, access control, audit logging and webhook verification.",
  path: "/security",
});

const capabilities = [
  {
    title: "API Authentication",
    description: "Requests are authenticated using scoped API keys, issued per business and per environment.",
  },
  {
    title: "Encryption in Transit",
    description: "API traffic is designed to run over HTTPS/TLS between your systems and the platform.",
  },
  {
    title: "Role-Based Access Control",
    description: "Dashboard and API access can be scoped by role, so team members only see what they need.",
  },
  {
    title: "Audit Logs",
    description: "Key account, configuration and transaction actions are recorded for traceability.",
  },
  {
    title: "Webhook Verification",
    description: "Webhook payloads are signed so your systems can verify the event originated from this platform.",
  },
  {
    title: "IP Restrictions",
    description: "API access can be restricted to an allow-list of IP addresses per business account.",
  },
  {
    title: "Secure Credential Storage",
    description: "Secrets and credentials are stored server-side and are never exposed in frontend code.",
  },
  {
    title: "Sandbox Environment",
    description: "A fully isolated sandbox lets you integrate and test without touching production data or funds.",
  },
  {
    title: "Transaction Monitoring",
    description: "Transactions flow through monitoring and status tracking from initiation through completion.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Security & Compliance"
        title="Security Built Into Every Transaction"
        description="The platform's architecture is designed around authentication, access control, auditability and verifiable webhooks."
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Platform Capabilities"
            title="Implemented Security Capabilities"
            align="left"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <Card key={c.title}>
                <h3 className="text-sm font-semibold text-text-primary">{c.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{c.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-light py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Licenses, Certifications & Partners"
            title="Compliance Information"
            align="left"
          />
          <Card className="mt-8 border-dashed">
            <p className="text-sm text-text-secondary">
              This section is a placeholder for verified regulatory licenses, industry certifications and banking
              or payment-provider partnerships once they are finalized and confirmed. NammaAPI does not claim any
              certification, license or regulatory approval that has not been independently verified.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li>— [Insert applicable regulatory registration / license details]</li>
              <li>— [Insert applicable security or compliance certifications, once obtained]</li>
              <li>— [Insert confirmed banking / payment-provider partnerships]</li>
            </ul>
          </Card>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
