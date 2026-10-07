import "server-only";
import { NextResponse } from "next/server";
import { callTransferAction } from "@/lib/server/aepsActions";
import type { TransferAction } from "@/lib/reports/table";
import { getSessionCredentials } from "@/lib/server/session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/** Shared POST handler for the per-transaction transfer actions: `{ id }` -> vendor action (session-gated). */
export async function handleTransferAction(request: Request, action: TransferAction) {
  const rate = checkRateLimit(`transfer-action:${action}:${getClientIp(request)}`, RATE_LIMIT);
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

  const result = await callTransferAction(action, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });

  return NextResponse.json({ ok: true, message: result.message });
}
