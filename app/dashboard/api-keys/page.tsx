import type { Metadata } from "next";
import { listApiKeys } from "@/lib/auth/apiKeys";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ApiKeysPanel } from "@/app/dashboard/ApiKeysPanel";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const keys = await listApiKeys();
  return (
    <>
      <PageHeader
        title="API Keys"
        description="Use these as bearer tokens for sandbox requests. Keep them secret — never ship them in frontend code."
      />
      <Card className="max-w-3xl">
        <ApiKeysPanel keys={keys} />
      </Card>
    </>
  );
}
