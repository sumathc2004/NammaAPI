import { buildMetadata } from "@/lib/metadata";
import { AdminOnly } from "@/components/dashboard/AdminOnly";
import { PgTallyView } from "@/components/dashboard/PgTallyView";

export const metadata = buildMetadata({
  title: "PG Tally",
  description: "Your card collections and wallet credits in your NammaAPI dashboard.",
  path: "/dashboard/pg-tally",
  noIndex: true,
});

/** A retailer's own PG tally: the server only returns this login's own collections. */
export default function PgTallyPage() {
  return (
    <AdminOnly role="retailer">
      <div className="min-w-0 xl:h-[max(26rem,calc(100dvh-7.5rem))]">
        <PgTallyView />
      </div>
    </AdminOnly>
  );
}
