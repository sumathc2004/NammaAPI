"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  clearDemoSession,
  parseDemoSession,
  readDemoSessionRaw,
  subscribeDemoSession,
  type AepsProfile,
} from "@/lib/auth/demoSession";

const balanceCards: { key: keyof AepsProfile; label: string }[] = [
  { key: "walletBalance", label: "Wallet Balance" },
  { key: "aepsBalance", label: "AEPS Balance" },
  { key: "bbpsBalance", label: "BBPS Balance" },
  { key: "cmsBalance", label: "CMS Balance" },
];

function formatInr(value: string): string {
  const amount = Number(value);
  if (!value || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

export function DashboardView() {
  const router = useRouter();
  // undefined on the server and during hydration; null once we know there's no session.
  const raw = useSyncExternalStore(subscribeDemoSession, readDemoSessionRaw, () => undefined);
  const profile = useMemo(() => parseDemoSession(raw), [raw]);

  useEffect(() => {
    if (raw !== undefined && !profile) router.replace("/login");
  }, [raw, profile, router]);

  if (!profile) {
    return <p className="text-center text-sm text-text-secondary">Loading your dashboard…</p>;
  }

  function logout() {
    clearDemoSession();
    router.push("/login");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Logged in as <span className="font-semibold text-text-primary">{profile.userName}</span>
          </p>
        </div>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </div>

      <Card className="mt-8 border-transparent bg-brand-gradient text-white">
        <p className="text-sm font-medium text-white/80">Total Balance</p>
        <p className="mt-1 text-4xl font-bold">{formatInr(profile.balance)}</p>
      </Card>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {balanceCards.map((card) => (
          <Card key={card.key}>
            <p className="text-xs font-medium text-text-secondary">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-text-primary">{formatInr(profile[card.key])}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
