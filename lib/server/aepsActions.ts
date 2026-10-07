import "server-only";
import { aepsRequest } from "@/lib/server/aepsClient";

export type DequeueResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * GET {CLIENT_API_BASE_URL}/Txn/UpdateDequeue?id=<id> — removes a transfer from the vendor's
 * processing queue. Confirmed response shape: { status: boolean, message: string, id: string }.
 */
export async function dequeueTransfer(id: string): Promise<DequeueResult> {
  const result = await aepsRequest("Txn/UpdateDequeue", { id }, { api: "client", prefer: "json" });
  if (!result.ok) return { ok: false, error: result.error };

  const body = result.body as { status?: boolean; message?: string } | null;
  if (!body || body.status !== true) {
    return { ok: false, error: body?.message || "The transaction could not be dequeued." };
  }
  return { ok: true, message: body.message || "Dequeue updated." };
}
