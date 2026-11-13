import { NextResponse } from "next/server";
import { fetchDisputeHistory } from "@/lib/server/aepsDisputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/**
 * GET /api/dashboard/admin/dispute-history → vendor bill/getMarkFailedWithDispute with the admin's own session
 * login. Admins and accountants only (the Dispute History page).
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-dispute-history:${getClientIp(request)}`, RATE_LIMIT);
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
    return NextResponse.json({ error: "This is only available to administrators." }, { status: 403 });
  }

  const result = await fetchDisputeHistory(credentials);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, rows: result.rows, fetchedAt: new Date().toISOString() });
}
