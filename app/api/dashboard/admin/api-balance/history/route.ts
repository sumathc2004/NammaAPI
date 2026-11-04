import { NextResponse } from "next/server";
import { fetchApiBalanceHistory } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { validateRange } from "@/lib/reports/dates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };
const DEFAULT_TOP_N = 50;
const MAX_TOP_N = 20000; // "All" on the page: about 8,500 snapshots a month

/**
 * GET /api/dashboard/admin/api-balance/history?fromDate=&toDate=&topN= → vendor getApiLevelBalance (saved
 * snapshots of the platform balances, newest first). The vendor endpoint needs no credentials, so the role
 * check here is the only gate: admins and accountants only (super access doesn't see the wallet or the difference).
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-api-balance-history:${getClientIp(request)}`, RATE_LIMIT);
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

  const params = new URL(request.url).searchParams;
  const from = params.get("fromDate") ?? "";
  const to = params.get("toDate") ?? "";
  const rangeError = validateRange(from, to);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const requested = Number(params.get("topN") ?? DEFAULT_TOP_N);
  const topN = Number.isInteger(requested) && requested >= 1 ? Math.min(requested, MAX_TOP_N) : DEFAULT_TOP_N;

  const result = await fetchApiBalanceHistory(from, to, topN);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true, snapshots: result.snapshots, fetchedAt: new Date().toISOString() });
}
