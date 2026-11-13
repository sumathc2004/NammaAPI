import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { DisputeRow } from "@/lib/admin/disputes";

export type DisputesResult = { ok: true; rows: DisputeRow[] } | { ok: false; error: string };
export type DisputeUpdateResult = { ok: true; message: string } | { ok: false; error: string };

const text = (value: unknown): string =>
  value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

/**
 * GET {…/v5bc/api}/bill/getDisputes?status= — the bill payment disputes (`{ status: "true", data: [...] }`).
 * No credentials, and `userName` is left out so the vendor lists every retailer's: admins and accountants only
 * (the route checks). `status` is OPEN / RESOLVED; "ALL" sends none.
 */
export async function fetchDisputes(status: string): Promise<DisputesResult> {
  const result = await aepsRequest("getDisputes", status === "ALL" ? {} : { status }, { controller: "bill", prefer: "json" });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: unknown; message?: unknown; data?: unknown } | null;
  if (!body || String(body.status).toLowerCase() !== "true" || !Array.isArray(body.data)) {
    console.error("AEPS getDisputes rejected:", JSON.stringify(body)?.slice(0, 300));
    return { ok: false, error: text(body?.message) || "The disputes could not be loaded." };
  }
  const rows = body.data
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, text(value)])));
  return { ok: true, rows };
}

/**
 * POST {…/v5bc/api}/bill/updateDispute with a JSON body `{ id, status, adminRemarks }` — sets a dispute's status
 * (RESOLVED) and the admin's remarks. Admins and accountants only (the route checks).
 */
export async function updateDispute(id: number, status: string, adminRemarks: string): Promise<DisputeUpdateResult> {
  const result = await aepsRequest("updateDispute", {}, { controller: "bill", method: "POST", prefer: "json", body: { id, status, adminRemarks } });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: unknown; message?: unknown } | null;
  const ok = body !== null && (body.status === true || String(body.status).toLowerCase() === "true");
  if (!ok) {
    console.error(`AEPS updateDispute rejected id ${id}:`, JSON.stringify(body)?.slice(0, 300));
    return { ok: false, error: text(body?.message) || "The dispute could not be updated." };
  }
  return { ok: true, message: text(body?.message) || "Dispute updated." };
}
