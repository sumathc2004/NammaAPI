import { NextResponse } from "next/server";
import { checkBpayStatus } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };
const REFERENCE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

/** POST /api/dashboard/admin/pg-tally/refresh { referenceNumber } → vendor bpayStatusCheck_admin. Admins only. */
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
  // The trustworthy admin check: from the encrypted session cookie, never from the browser.
  if (!credentials.isAdmin) {
    return NextResponse.json({ error: "This is only available to administrators." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const referenceNumber =
    typeof (body as Record<string, unknown> | null)?.referenceNumber === "string"
      ? (body as { referenceNumber: string }).referenceNumber.trim()
      : "";
  if (!REFERENCE_PATTERN.test(referenceNumber)) {
    return NextResponse.json({ error: "Missing or invalid reference number." }, { status: 400 });
  }

  const result = await checkBpayStatus(referenceNumber);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, referenceNumber, check: result.check });
}
