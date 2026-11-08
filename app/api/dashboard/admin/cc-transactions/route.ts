import { NextResponse } from "next/server";
import { fetchCcTransactions } from "@/lib/server/ccTransactions";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/** The vendor takes about 20 s to answer. */
export const maxDuration = 60;

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/**
 * GET /api/dashboard/admin/cc-transactions → vendor CreditCard/Statement (the Bulkpe credit-card bill payments),
 * joined with Bill Payments for the card's last 4 digits, the mobile and the shop. Admins only (`isAdmin` in the
 * encrypted session cookie): the vendor endpoint needs no credentials, so this check is the only gate.
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-cc-transactions:${getClientIp(request)}`, RATE_LIMIT);
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
  if (!credentials.isAdmin) {
    return NextResponse.json({ error: "This is only available to administrators." }, { status: 403 });
  }

  const result = await fetchCcTransactions();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, ...result.data });
}
