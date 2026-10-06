import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/pg-reports?fromDate=&toDate= → vendor BpPayment/GetLinksByDate (logged-in user's number). */
export function GET(request: Request) {
  return handleReportRequest(request, "pg-reports");
}
