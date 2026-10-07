import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";
import type { TransferAction } from "@/lib/reports/table";

export type TransferActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * POST {CLIENT_API_BASE_URL}/Txn/<endpoint>?id=<id> — the vendor's per-transaction transfer
 * actions (GET returns HTTP 405; the vendor's action endpoints take the parameter in the query
 * string even on POST, same as the login endpoint). All three confirmed to share the same
 * response shape: { status: boolean, message: string, id: string }.
 */
const ACTION_ENDPOINTS: Record<TransferAction, { endpoint: string; fallbackMessage: string; fallbackError: string }> = {
  dequeue: { endpoint: "Txn/UpdateDequeue", fallbackMessage: "Dequeue updated.", fallbackError: "The transaction could not be dequeued." },
  enqueue: { endpoint: "Txn/UpdateEnqueue", fallbackMessage: "Enqueue updated.", fallbackError: "The transaction could not be enqueued." },
  refund: { endpoint: "Txn/ProcessRefund", fallbackMessage: "Refund processed.", fallbackError: "The refund could not be processed." },
};

export async function callTransferAction(action: TransferAction, id: string): Promise<TransferActionResult> {
  const { endpoint, fallbackMessage, fallbackError } = ACTION_ENDPOINTS[action];
  const result = await aepsRequest(endpoint, { id }, { api: "client", method: "POST", prefer: "json" });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: boolean; message?: string; id?: string } | null;
  if (!body || body.status !== true) {
    // id isn't a secret (unlike the password on other vendor calls) — safe to log for diagnosis.
    console.error(`AEPS ${endpoint} rejected id "${id}":`, JSON.stringify(body));
    return { ok: false, error: body?.message || fallbackError };
  }
  return { ok: true, message: body.message || fallbackMessage };
}
