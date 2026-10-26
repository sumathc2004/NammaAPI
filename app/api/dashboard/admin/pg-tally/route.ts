import { NextResponse } from "next/server";
import { fetchPgTally } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { tallyScope } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { todayInIndia, validateRange } from "@/lib/reports/dates";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/**
 * GET /api/dashboard/admin/pg-tally?fromDate=&toDate= → vendor PgTallyReport, scoped by who is asking:
 * admins get every retailer's collections; every other login (accountant, super access, retailer) gets
 * only its own retailer's rows. The vendor can't filter, so the filtering happens here, from the session.
 */
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
  // The scope comes from the encrypted session cookie, never from the browser.
  const owner = tallyScope(credentials) === "all" ? undefined : credentials.userName;

  const params = new URL(request.url).searchParams;
  const today = todayInIndia();
  const fromDate = params.get("fromDate") || today;
  const toDate = params.get("toDate") || today;
  // Same date rules as PG Reports (it's the same card collections).
  const rangeError = validateRange(fromDate, toDate, "pg-reports");
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const result = await fetchPgTally(fromDate, toDate, owner);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, fromDate, toDate, rows: result.rows, fetchedAt: new Date().toISOString() });
}
