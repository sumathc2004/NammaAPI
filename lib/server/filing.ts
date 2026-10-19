import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { InvoiceQuery, InvoiceRow } from "@/lib/filing/invoices";

export type InvoicesResult = { ok: true; rows: InvoiceRow[] } | { ok: false; error: string };

const toText = (value: unknown): string => (value === null || value === undefined ? "" : String(value));

/** The first array found in a response, whatever its wrapper is called. */
function findRows(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    for (const value of Object.values(body)) {
      const rows = findRows(value);
      if (rows.length) return rows;
    }
  }
  return [];
}

/**
 * Vendor `GET {CLIENT_API_BASE_URL}/APIClient/GetInvoicesByMonth?fy=26-27&month=8&year=2026`:
 * a JSON array of invoices (`[]` when the month has none). Needs no credentials, so none are sent.
 */
export async function fetchInvoicesByMonth({ fy, month, year }: InvoiceQuery): Promise<InvoicesResult> {
  const result = await aepsRequest(
    "APIClient/GetInvoicesByMonth",
    { fy, month: String(month), year: String(year) },
    { api: "client", prefer: "json" },
  );
  if (!result.ok) return { ok: false, error: result.error };

  const rows = findRows(result.body)
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, toText(v)])));
  return { ok: true, rows };
}

export type GenerateResult =
  | { ok: true; created: number; lastInvoice: string }
  | { ok: false; error: string };

/**
 * Vendor `POST {CLIENT_API_BASE_URL}/APIClient/CreateMissingMonthlyInvoices?fy=26-27&month=8&year=2026`
 * creates the month's invoices that don't exist yet. Success: `{ status: "true", fy, month, year,
 * invoicesCreated, lastInvoice }`; failure: `{ status: "false", message }` (e.g. "fy and month are required").
 */
export async function generateMissingInvoices({ fy, month, year }: InvoiceQuery): Promise<GenerateResult> {
  const result = await aepsRequest(
    "APIClient/CreateMissingMonthlyInvoices",
    { fy, month: String(month), year: String(year) },
    { api: "client", method: "POST", prefer: "json", timeoutMs: 120_000 },
  );
  if (!result.ok) return { ok: false, error: result.error };

  const body = (result.body && typeof result.body === "object" ? result.body : {}) as Record<string, unknown>;
  if (String(body.status) !== "true") {
    // The vendor's own reply (no credentials involved), safe to log.
    console.error("CreateMissingMonthlyInvoices rejected:", JSON.stringify(body).slice(0, 500));
    return { ok: false, error: typeof body.message === "string" && body.message ? body.message : "The invoices could not be generated." };
  }
  return { ok: true, created: Number(body.invoicesCreated) || 0, lastInvoice: toText(body.lastInvoice) };
}
