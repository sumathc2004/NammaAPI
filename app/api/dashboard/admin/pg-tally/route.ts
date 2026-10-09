import { NextResponse } from "next/server";
import { fetchPgTally } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { todayInIndia, validateRange } from "@/lib/reports/dates";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/** GET /api/dashboard/admin/pg-tally?fromDate=&toDate= → vendor PgTallyReport. Admins only, checked server-side. */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-pg-tally:${getClientIp(request)}`, RATE_LIMIT);
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
  // The trustworthy admin check: from the encrypted session cookie, never from the browser.
  if (!credentials.isAdmin) {
    return NextResponse.json({ error: "This is only available to administrators." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const today = todayInIndia();
  const fromDate = params.get("fromDate") || today;
  const toDate = params.get("toDate") || today;
  // Same date rules as PG Reports (it's the same card collections).
  const rangeError = validateRange(fromDate, toDate, "pg-reports");
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const result = await fetchPgTally(fromDate, toDate);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, fromDate, toDate, rows: result.rows, fetchedAt: new Date().toISOString() });
}
