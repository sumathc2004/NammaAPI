import { handleReportRequest } from "@/lib/server/reportRequest";

/** GET /api/dashboard/transfer?fromDate=&toDate= → vendor POST transfer/report (session credentials). */
export function GET(request: Request) {
  return handleReportRequest(request, "transfer");
}
