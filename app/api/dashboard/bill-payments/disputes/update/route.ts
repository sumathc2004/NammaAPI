import { NextResponse } from "next/server";
import { updateDispute } from "@/lib/server/aepsDisputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
const MAX_REMARKS = 500;

/**
 * POST { id, adminRemarks } → vendor bill/updateDispute with status RESOLVED. Admins and accountants only; the
 * vendor endpoint needs no credentials, so this role check is the only gate. Only RESOLVED can be set from here.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`bill-dispute-update:${getClientIp(request)}`, RATE_LIMIT);
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

  const body = (await request.json().catch(() => null)) as { id?: unknown; adminRemarks?: unknown } | null;
  const id = Number(body?.id);
  const remarks = typeof body?.adminRemarks === "string" ? body.adminRemarks.trim() : "";
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "Missing dispute id." }, { status: 400 });
  if (!remarks) return NextResponse.json({ error: "Write the remarks first." }, { status: 400 });
  if (remarks.length > MAX_REMARKS) return NextResponse.json({ error: `Remarks can be at most ${MAX_REMARKS} characters.` }, { status: 400 });

  const result = await updateDispute(id, "RESOLVED", remarks);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true, message: result.message });
}
