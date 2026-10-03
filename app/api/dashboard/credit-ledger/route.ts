import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/credit-ledger?fromDate=&toDate= → vendor GetWalletTransactions_swallet. */
export function GET(request: Request) {
  return handleReportRequest(request, "credit-ledger");
}
