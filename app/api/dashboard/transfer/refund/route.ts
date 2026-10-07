import { handleTransferAction } from "@/lib/server/transferActionRequest";

/** POST /api/dashboard/transfer/refund { id } → vendor POST Txn/ProcessRefund?id= (session-gated). */
export function POST(request: Request) {
  return handleTransferAction(request, "refund");
}
