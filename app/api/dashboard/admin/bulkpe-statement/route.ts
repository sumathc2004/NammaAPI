import { NextResponse } from "next/server";
import { fetchBulkpeStatement } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
const MAX_PAGE = 1000;

/**
 * GET /api/dashboard/admin/bulkpe-statement?page=N → vendor APIClient/GetBulkpeStatement (page 1 =
 * newest). The whole platform's payout account, so admins and accountants only (not super access),
 * checked here from the session cookie.
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-bulkpe-statement:${getClientIp(request)}`, RATE_LIMIT);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  const credentials = await getSessionCredentials();
  if (!credentials) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
  if (adminAccess(credentials) !== "full") {
    return NextResponse.json({ error: "This is only available to administrators and accountants." }, { status: 403 });
  }

  const pageParam = new URL(request.url).searchParams.get("page") || "1";
  const page = /^\d{1,4}$/.test(pageParam) ? Number(pageParam) : NaN;
  if (!(page >= 1 && page <= MAX_PAGE)) {
    return NextResponse.json({ error: "Choose a valid page." }, { status: 400 });
  }

  const result = await fetchBulkpeStatement(page);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, ...result.statement, fetchedAt: new Date().toISOString() });
}
