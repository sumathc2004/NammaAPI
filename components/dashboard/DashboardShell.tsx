"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";
import { WalletBalances } from "@/components/dashboard/WalletBalances";
import { parseDemoSession, readDemoSessionRaw, subscribeDemoSession } from "@/lib/auth/demoSession";
import { cn } from "@/lib/cn";

const MOBILE_DRAWER_ID = "dashboard-drawer";
const COLLAPSED_STORAGE_KEY = "namma-sidebar-collapsed";

/** Remembered sidebar preference; storage can be unavailable (private mode), so fall back to expanded. */
function readCollapsedPreference(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * App frame for every /dashboard page: top navbar (logo + profile), sidebar, content area.
 * Sends the visitor to /login when there is no (prototype) session.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // undefined on the server and during hydration; null once we know there's no session.
  const raw = useSyncExternalStore(subscribeDemoSession, readDemoSessionRaw, () => undefined);
  const profile = useMemo(() => parseDemoSession(raw), [raw]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  // Read during the first client render; the sidebar isn't rendered until the session is known,
  // so this can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [lastPathname, setLastPathname] = useState(pathname);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    } catch {}
  }
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (raw !== undefined && !profile) router.replace("/login");
  }, [raw, profile, router]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light">
        <p className="text-sm text-text-secondary">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    // Exactly one screen tall: the page itself never scrolls; only the content area (and report tables) do.
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-light/60">
      <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-brand-border bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls={MOBILE_DRAWER_ID}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-primary hover:bg-brand-light lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <Logo href="/dashboard" priority />
        </div>
        <div className="flex items-center gap-3">
          <WalletBalances profile={profile} className="hidden md:flex" />
          <ProfileMenu profile={profile} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden transition-[width] duration-300 lg:block",
            collapsed ? "w-18" : "w-64",
          )}
        >
          <DashboardSidebar collapsed={collapsed} isAdmin={profile.isAdmin} onToggleCollapse={toggleCollapsed} />
        </aside>

        {/* Mobile drawer */}
        <div
          id={MOBILE_DRAWER_ID}
          inert={!drawerOpen}
          className={cn("fixed inset-0 z-50 lg:hidden", !drawerOpen && "pointer-events-none")}
        >
          <div
            onClick={() => setDrawerOpen(false)}
            className={cn(
              "absolute inset-0 bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-300",
              drawerOpen ? "opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-transform duration-300",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-16 shrink-0 items-center justify-between bg-brand-navy px-4">
              <Logo variant="white" href="/dashboard" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <DashboardSidebar isAdmin={profile.isAdmin} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>

        <main
          id="main-content"
          className="scrollbar-light flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
