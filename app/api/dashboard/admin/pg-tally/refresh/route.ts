import { NextResponse } from "next/server";
import { checkBpayStatus, fetchPgTally } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { tallyScope } from "@/lib/auth/adminAccess";
import { validateRange } from "@/lib/reports/dates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };
const REFERENCE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

/**
 * POST /api/dashboard/admin/pg-tally/refresh { referenceNumber, collectionId, date } → vendor
 * bpayStatusCheck_admin. Admins and accountants may check any collection; super access only its own
 * retailer's (checked against that day's tally), retailers none — the vendor call itself takes no credentials.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`admin-pg-refresh:${getClientIp(request)}`, RATE_LIMIT);
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

  const scope = tallyScope(credentials);
  if (scope === "none") {
    return NextResponse.json({ error: "This is only available to administrators, accountants and super access." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (key: string) => (typeof body?.[key] === "string" ? (body[key] as string).trim() : "");
  const referenceNumber = field("referenceNumber");
  const collectionId = field("collectionId");
  if (!REFERENCE_PATTERN.test(referenceNumber) || !REFERENCE_PATTERN.test(collectionId)) {
    return NextResponse.json({ error: "Missing or invalid reference number or collection ID." }, { status: 400 });
  }

  // Super access: the collection must be one of the caller's own (looked up in that day's tally).
  if (scope === "own") {
    const date = field("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || validateRange(date, date, "pg-reports")) {
      return NextResponse.json({ error: "Missing or invalid date." }, { status: 400 });
    }
    const own = await fetchPgTally(date, date, credentials.userName);
    if (!own.ok) return NextResponse.json({ error: own.error }, { status: 502 });
    if (!own.rows.some((row) => row.referenceNumber === referenceNumber && row.collectionId === collectionId)) {
      return NextResponse.json({ error: "That collection isn't yours." }, { status: 403 });
    }
  }

  // The vendor calls the collection ID "pgOrderId".
  const result = await checkBpayStatus(referenceNumber, collectionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, referenceNumber, check: result.check });
}
