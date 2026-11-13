import { NextResponse } from "next/server";
import { fetchDisputes } from "@/lib/server/aepsDisputes";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };
const STATUSES = new Set(["OPEN", "RESOLVED", "ALL"]);

/**
 * GET /api/dashboard/bill-payments/disputes?status=OPEN|RESOLVED|ALL → vendor bill/getDisputes (every retailer's
 * disputes). The vendor endpoint needs no credentials, so this role check — admins and accountants — is the only gate.
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`bill-disputes:${getClientIp(request)}`, RATE_LIMIT);
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

  const status = (new URL(request.url).searchParams.get("status") ?? "OPEN").toUpperCase();
  if (!STATUSES.has(status)) return NextResponse.json({ error: "Unknown status." }, { status: 400 });

  const result = await fetchDisputes(status);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, rows: result.rows });
}
