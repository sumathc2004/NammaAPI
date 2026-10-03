import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/** Logged-in app frame. Deliberately outside app/(site), so the marketing navbar and footer don't render here. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
