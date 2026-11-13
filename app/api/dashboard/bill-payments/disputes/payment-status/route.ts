import { NextResponse } from "next/server";
import { fetchPaymentStatus } from "@/lib/server/aepsDisputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };
const UNIQUE_ID = /^[A-Za-z0-9_-]{1,60}$/;

/**
 * POST { uniqueId } → vendor bill/getPaymentStatusByRef: the live status of the bill payment behind a dispute.
 * Admins and accountants only (the Disputes tab); the vendor endpoint needs no credentials, so this is the gate.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`bill-dispute-status:${getClientIp(request)}`, RATE_LIMIT);
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

  const body = (await request.json().catch(() => null)) as { uniqueId?: unknown } | null;
  const uniqueId = typeof body?.uniqueId === "string" ? body.uniqueId.trim() : "";
  if (!UNIQUE_ID.test(uniqueId)) return NextResponse.json({ error: "Missing transaction." }, { status: 400 });

  const result = await fetchPaymentStatus(uniqueId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, payment: result.payment });
}
