import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/aeps-reports?fromDate=&toDate= → vendor GetTxnsByDate (logged-in user's number). */
export function GET(request: Request) {
  return handleReportRequest(request, "aeps-reports");
}
