import { handleTransferAction } from "@/lib/server/transferActionRequest";

/** POST /api/dashboard/transfer/dequeue { id } → vendor POST Txn/UpdateDequeue?id= (session-gated). */
export function POST(request: Request) {
  return handleTransferAction(request, "dequeue");
}
