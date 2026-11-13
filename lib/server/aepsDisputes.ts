import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { DisputeRow } from "@/lib/admin/disputes";

export type DisputesResult = { ok: true; rows: DisputeRow[] } | { ok: false; error: string };
export type DisputeUpdateResult = { ok: true; message: string } | { ok: false; error: string };

const text = (value: unknown): string =>
  value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

/**
 * GET {…/v5bc/api}/bill/getDisputes?userName=&status= — bill payment disputes. Checked against the live API:
 * `{ status: "true", data: [{ Id, UniqueId, UserName, Reason, Status ("OPEN" / "RESOLVED"), RaisedAt, ResolvedAt,
 * AdminRemarks, BillPaidRefNo }] }`, null values for what isn't set yet; an unknown `status` just lists nothing.
 * No credentials. `userName` limits it to one retailer; left out, the vendor lists every retailer's (the route only
 * does that for admins and accountants). "ALL" sends no status.
 */
export async function fetchDisputes(status: string, userName?: string): Promise<DisputesResult> {
  const params: Record<string, string> = {};
  if (status !== "ALL") params.status = status;
  if (userName) params.userName = userName;
  const result = await aepsRequest("getDisputes", params, { controller: "bill", prefer: "json" });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: unknown; message?: unknown; data?: unknown } | null;
  if (!body || String(body.status).toLowerCase() !== "true" || !Array.isArray(body.data)) {
    console.error("AEPS getDisputes rejected:", JSON.stringify(body)?.slice(0, 300));
    return { ok: false, error: "The disputes could not be loaded." };
  }
  const rows = body.data
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
    .map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, text(value)])));
  return { ok: true, rows };
}

/**
 * The vendor's write calls answer `{ status: "true", data: [{ Success: true, Message: "Dispute raised", Id }] }`
 * (raise) or `data: [{ Success: true, Message: "Updated" }]` (update). A failure is `{ status: "false", message }`
 * where the message is the database's own error text (table and column names, "INSERT fails"), so it is logged here
 * and never shown to the user.
 */
function readWriteResult(what: string, body: unknown, fallbackOk: string, fallbackError: string): DisputeUpdateResult {
  const parsed = body as { status?: unknown; message?: unknown; data?: unknown } | null;
  const first = Array.isArray(parsed?.data) ? (parsed.data[0] as { Success?: unknown; Message?: unknown } | undefined) : undefined;
  const ok = parsed !== null && String(parsed.status).toLowerCase() === "true" && first?.Success !== false;
  if (!ok) {
    console.error(`AEPS ${what} rejected:`, JSON.stringify(body)?.slice(0, 300));
    return { ok: false, error: fallbackError };
  }
  return { ok: true, message: text(first?.Message) || fallbackOk };
}

export type RaiseDisputeInput = { uniqueId: string; userName: string; reason: string; billPaidRefNo: string };

/**
 * POST {…/v5bc/api}/bill/raiseDispute with a JSON body `{ uniqueId, userName, reason, billPaidRefNo }` (a query string
 * gets HTTP 411) — a retailer telling us a bill payment was debited but not paid. No credentials, and the vendor does
 * not check that the transaction exists or belongs to `userName` (a made-up id was accepted), so the route decides
 * `userName` from the session. All four fields are required by the database (an empty body fails on `UniqueId`).
 */
export async function raiseDispute(input: RaiseDisputeInput): Promise<DisputeUpdateResult> {
  const result = await aepsRequest("raiseDispute", {}, { controller: "bill", method: "POST", prefer: "json", body: input });
  if (!result.ok) return { ok: false, error: result.error };
  return readWriteResult(`raiseDispute ${input.uniqueId}`, result.body, "Dispute raised.", "The dispute could not be raised. Please try again.");
}

/**
 * POST {…/v5bc/api}/bill/updateDispute with a JSON body `{ id, status, adminRemarks }` — sets a dispute's status
 * (RESOLVED) and the admin's remarks. The vendor answers "Updated" even for an id that doesn't exist, so a success
 * only means the call went through. Admins and accountants only (the route checks).
 */
export async function updateDispute(id: number, status: string, adminRemarks: string): Promise<DisputeUpdateResult> {
  const result = await aepsRequest("updateDispute", {}, { controller: "bill", method: "POST", prefer: "json", body: { id, status, adminRemarks } });
  if (!result.ok) return { ok: false, error: result.error };
  return readWriteResult(`updateDispute ${id}`, result.body, "Dispute updated.", "The dispute could not be updated. Please try again.");
}
