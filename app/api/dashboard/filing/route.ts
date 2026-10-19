import { NextResponse } from "next/server";
import { hasPageRole } from "@/lib/auth/adminAccess";
import { parseInvoiceQuery } from "@/lib/filing/invoices";
import { fetchInvoicesByMonth } from "@/lib/server/filing";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/** GET /api/dashboard/filing?month=8&year=2026[&fy=26-27] → vendor GetInvoicesByMonth. Admins and accountants. */
export async function GET(request: Request) {
  const rate = checkRateLimit(`filing:${getClientIp(request)}`, RATE_LIMIT);
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
  if (!hasPageRole(credentials, "adminOrAccountant")) {
    return NextResponse.json({ error: "This is only available to administrators and accountants." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const query = parseInvoiceQuery(params.get("month"), params.get("year"), params.get("fy"));
  if (!query) return NextResponse.json({ error: "Choose a valid month and year." }, { status: 400 });

  const result = await fetchInvoicesByMonth(query);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, ...query, rows: result.rows });
}
