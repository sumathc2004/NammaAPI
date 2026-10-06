import "server-only";
import { NextResponse } from "next/server";
import type { DashboardSectionId } from "@/lib/data/dashboardNav";
import { todayInIndia, validateRange } from "@/lib/reports/dates";
import { fetchReport } from "@/lib/server/aepsReports";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/**
 * Shared GET handler for dashboard reports: `?fromDate=yyyy-MM-dd&toDate=yyyy-MM-dd` (both default
 * to today). Credentials come only from the encrypted session cookie — the browser never sends them.
 */
export async function handleReportRequest(request: Request, section: DashboardSectionId) {
  const rate = checkRateLimit(`report:${section}:${getClientIp(request)}`, RATE_LIMIT);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const today = todayInIndia();
  const fromDate = params.get("fromDate") || today;
  const toDate = params.get("toDate") || today;

  const rangeError = validateRange(fromDate, toDate);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const credentials = await getSessionCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }

  const result = await fetchReport(section, credentials, fromDate, toDate);
  if (!result.ok) {
    const status = result.sessionExpired ? 401 : result.unavailable ? 503 : 422;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, fromDate, toDate, table: result.table });
}
