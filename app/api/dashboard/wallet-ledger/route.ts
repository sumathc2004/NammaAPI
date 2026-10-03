import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/wallet-ledger?fromDate=&toDate= → vendor GetWalletTransactions. */
export function GET(request: Request) {
  return handleReportRequest(request, "wallet-ledger");
}
