import { NextResponse } from "next/server";
import { hasPageRole } from "@/lib/auth/adminAccess";
import { parseInvoiceQuery } from "@/lib/filing/invoices";
import { generateMissingInvoices } from "@/lib/server/filing";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Creates invoices at the vendor, so far tighter than the read routes.
const RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

/** POST /api/dashboard/filing/generate { month, year } → vendor CreateMissingMonthlyInvoices. Admins and accountants. */
export async function POST(request: Request) {
  const rate = checkRateLimit(`filing-generate:${getClientIp(request)}`, RATE_LIMIT);
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

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const query = parseInvoiceQuery(String(body.month ?? ""), String(body.year ?? ""), null);
  if (!query) return NextResponse.json({ error: "Choose a valid month and year." }, { status: 400 });

  const result = await generateMissingInvoices(query);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, ...query, created: result.created, lastInvoice: result.lastInvoice });
}
