import { apiFetch } from "@/lib/auth/session";
import { cn } from "@/lib/cn";

async function isApiUp() {
  try {
    const res = await apiFetch("/api/health", { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ApiStatus() {
  const up = await isApiUp();
  const checkedAt = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  const rows = [
    { name: "Accounts & authentication", up },
    { name: "Sandbox API keys", up },
  ];

  return (
    <div className="mt-5 max-w-xl overflow-hidden rounded-xl border border-brand-border">
      <ul className="divide-y divide-brand-border">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-text-primary">{row.name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                row.up ? "bg-status-success-bg text-status-success" : "bg-status-failed-bg text-status-failed",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", row.up ? "bg-status-success" : "bg-status-failed")} />
              {row.up ? "Operational" : "Unavailable"}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-brand-border bg-brand-light px-4 py-2 text-xs text-text-secondary">
        Checked live at {checkedAt} IST
      </p>
    </div>
  );
}
