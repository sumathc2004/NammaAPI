import { NextResponse } from "next/server";
import { raiseDispute } from "@/lib/server/aepsDisputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };
const CODE = /^[A-Za-z0-9_-]{1,40}$/;
const MOBILE = /^\d{10}$/;
const MIN_REASON = 5;
const MAX_REASON = 300;

/**
 * POST { uniqueId, billPaidRefNo, reason, userName? } → vendor bill/raiseDispute. The retailer's own login number
 * (from the session) is the dispute's `userName`; only admins and accountants, who see every retailer's bill
 * payments, may name another retailer's number (their rows carry it). The vendor endpoint needs no credentials,
 * so the session check here is the only gate, and it can't confirm the bill payment belongs to the caller.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`bill-dispute-raise:${getClientIp(request)}`, RATE_LIMIT);
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const uniqueId = str(body?.uniqueId);
  const billPaidRefNo = str(body?.billPaidRefNo);
  const reason = str(body?.reason);
  if (!CODE.test(uniqueId)) return NextResponse.json({ error: "Missing or invalid transaction id." }, { status: 400 });
  if (billPaidRefNo && !CODE.test(billPaidRefNo)) return NextResponse.json({ error: "Invalid bill reference." }, { status: 400 });
  if (reason.length < MIN_REASON) return NextResponse.json({ error: "Please describe the problem." }, { status: 400 });
  if (reason.length > MAX_REASON) return NextResponse.json({ error: `The reason can be at most ${MAX_REASON} characters.` }, { status: 400 });

  const requested = str(body?.userName);
  const userName = adminAccess(credentials) === "full" && MOBILE.test(requested) ? requested : credentials.userName;

  const result = await raiseDispute({ uniqueId, userName, reason, billPaidRefNo });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, message: result.message });
}
