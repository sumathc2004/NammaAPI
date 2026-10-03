import { redirect } from "next/navigation";
import { DEFAULT_DASHBOARD_PATH } from "@/lib/data/dashboardNav";

/** /dashboard has no page of its own: open the first sidebar section. */
export default function DashboardIndexPage() {
  redirect(DEFAULT_DASHBOARD_PATH);
}
