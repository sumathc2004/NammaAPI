"use client";

import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { parseDemoSession, readDemoSessionRaw, subscribeDemoSession } from "@/lib/auth/demoSession";
import { DEFAULT_DASHBOARD_PATH } from "@/lib/data/dashboardNav";

/**
 * Renders admin pages only for admin accounts and sends everyone else back to the dashboard.
 * This hides the UI only: any admin API route must check `isAdmin` from the session cookie
 * (getSessionCredentials) on the server.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const raw = useSyncExternalStore(subscribeDemoSession, readDemoSessionRaw, () => undefined);
  const isAdmin = useMemo(() => parseDemoSession(raw)?.isAdmin === true, [raw]);

  useEffect(() => {
    if (raw !== undefined && !isAdmin) router.replace(DEFAULT_DASHBOARD_PATH);
  }, [raw, isAdmin, router]);

  return isAdmin ? children : null;
}
