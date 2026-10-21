import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/bill-payments?fromDate=&toDate= → vendor APIClient/GetBillPaymentsDatewise (logged-in user's username). */
export function GET(request: Request) {
  return handleReportRequest(request, "bill-payments");
}
