import { NextResponse } from "next/server";
import { checkBpayStatus } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };
const REFERENCE_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

/** POST /api/dashboard/admin/pg-tally/refresh { referenceNumber, collectionId } → vendor bpayStatusCheck_admin. Admins only. */
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (key: string) => (typeof body?.[key] === "string" ? (body[key] as string).trim() : "");
  const referenceNumber = field("referenceNumber");
  const collectionId = field("collectionId");
  if (!REFERENCE_PATTERN.test(referenceNumber) || !REFERENCE_PATTERN.test(collectionId)) {
    return NextResponse.json({ error: "Missing or invalid reference number or collection ID." }, { status: 400 });
  }

  // The vendor calls the collection ID "pgOrderId".
  const result = await checkBpayStatus(referenceNumber, collectionId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, referenceNumber, check: result.check });
}
