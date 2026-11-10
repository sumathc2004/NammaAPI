import { NextResponse } from "next/server";
import { checkTransferStatus } from "@/lib/server/aepsActions";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
const UNIQUE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * POST { uniqueId } → the vendor's live status of one transfer (checkBulkpeStatus). Session-gated and
 * rate-limited like the other transfer row actions; the vendor endpoint itself needs no credentials.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`transfer-status:${getClientIp(request)}`, RATE_LIMIT);
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

  const body = await request.json().catch(() => null);
  const uniqueId = typeof (body as Record<string, unknown> | null)?.uniqueId === "string" ? (body as { uniqueId: string }).uniqueId.trim() : "";
  if (!UNIQUE_ID.test(uniqueId)) return NextResponse.json({ error: "Missing or invalid transaction id." }, { status: 400 });

  const result = await checkTransferStatus(uniqueId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, check: result.check });
}
