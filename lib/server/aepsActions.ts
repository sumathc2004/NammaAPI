import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";

export type DequeueResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * POST {CLIENT_API_BASE_URL}/Txn/UpdateDequeue?id=<id> — removes a transfer from the vendor's
 * processing queue (GET returns HTTP 405; the vendor's action endpoints take the parameter in the
 * query string even on POST, same as the login endpoint). Confirmed response shape:
 * { status: boolean, message: string, id: string }.
 */
export async function dequeueTransfer(id: string): Promise<DequeueResult> {
  const result = await aepsRequest("Txn/UpdateDequeue", { id }, { api: "client", method: "POST", prefer: "json" });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: boolean; message?: string; id?: string } | null;
  if (!body || body.status !== true) {
    // id isn't a secret (unlike the password on other vendor calls) — safe to log for diagnosis.
    console.error(`AEPS Txn/UpdateDequeue rejected id "${id}":`, JSON.stringify(body));
    return { ok: false, error: body?.message || "The transaction could not be dequeued." };
  }
  return { ok: true, message: body.message || "Dequeue updated." };
}
