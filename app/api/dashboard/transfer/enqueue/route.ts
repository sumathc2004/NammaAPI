import { handleTransferAction } from "@/lib/server/transferActionRequest";

/** POST /api/dashboard/transfer/enqueue { id } → vendor POST Txn/UpdateEnqueue?id= (session-gated). */
export function POST(request: Request) {
  return handleTransferAction(request, "enqueue");
}
