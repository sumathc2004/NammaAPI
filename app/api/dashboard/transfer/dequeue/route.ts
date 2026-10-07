import { NextResponse } from "next/server";
import { dequeueTransfer } from "@/lib/server/aepsActions";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/** POST /api/dashboard/transfer/dequeue { id } → vendor GET Txn/UpdateDequeue?id= (session-gated). */
export async function POST(request: Request) {
  const rate = checkRateLimit(`dequeue:${getClientIp(request)}`, RATE_LIMIT);
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
  const id = typeof (body as Record<string, unknown> | null)?.id === "string" ? (body as { id: string }).id.trim() : "";
  if (!id) return NextResponse.json({ error: "Missing transaction id." }, { status: 400 });

  const result = await dequeueTransfer(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  return NextResponse.json({ ok: true, message: result.message });
}
