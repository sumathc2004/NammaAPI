import { NextResponse } from "next/server";
import { fetchDisputes, fetchPaymentStatus, refundBillPayment } from "@/lib/server/aepsDisputes";
import { disputeView } from "@/lib/admin/disputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };
const UNIQUE_ID = /^[A-Za-z0-9_-]{1,60}$/;

/**
 * POST { uniqueId } → vendor bill/refund, with the signed-in account's own login from the session. Admins and
 * accountants (any payment) and super-access accounts (only a payment that has an OPEN dispute raised by their own
 * login — the vendor does not check ownership, so this route does). Only for a payment the vendor reports as FAILED
 * right now (checked again here through getPaymentStatusByRef, because the vendor validates very little itself).
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`bill-refund:${getClientIp(request)}`, RATE_LIMIT);
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
  const full = adminAccess(credentials) === "full";
  if (!full && !credentials.isSuperAccess) {
    return NextResponse.json({ error: "You can't refund a bill payment." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { uniqueId?: unknown } | null;
  const uniqueId = typeof body?.uniqueId === "string" ? body.uniqueId.trim() : "";
  if (!UNIQUE_ID.test(uniqueId)) return NextResponse.json({ error: "Missing transaction." }, { status: 400 });

  if (!full) {
    // Super access: only the payments this very login has an open dispute on.
    const own = await fetchDisputes("OPEN", credentials.userName);
    if (!own.ok) return NextResponse.json({ error: own.error }, { status: 422 });
    if (!own.rows.some((row) => disputeView(row).uniqueId === uniqueId)) {
      return NextResponse.json({ error: "Only a payment with your own open dispute can be refunded." }, { status: 403 });
    }
  }

  const current = await fetchPaymentStatus(uniqueId);
  if (!current.ok) return NextResponse.json({ error: current.error }, { status: 422 });
  if (current.payment.status.trim().toUpperCase() !== "FAILED") {
    return NextResponse.json({ error: "Only a failed payment can be refunded." }, { status: 409 });
  }

  const result = await refundBillPayment(credentials, uniqueId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, message: result.message });
}
