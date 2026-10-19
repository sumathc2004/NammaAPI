import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Group your integrations, keys and webhooks by project." />
      <EmptyState title="No projects yet">Projects you create will appear here.</EmptyState>
    </>
  );
}
