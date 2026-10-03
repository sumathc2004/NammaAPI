import { NextResponse } from "next/server";
import { fetchApiLevelBalance } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/** GET /api/dashboard/admin/api-balance → vendor getapiLevelbalance. Admins only, checked server-side. */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-api-balance:${getClientIp(request)}`, RATE_LIMIT);
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

  const result = await fetchApiLevelBalance(credentials);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, balance: result.balance, fetchedAt: new Date().toISOString() });
}
