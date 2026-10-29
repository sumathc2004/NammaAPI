import { NextResponse } from "next/server";
import { fetchApiLevelBalance } from "@/lib/server/aepsAdmin";
import { getSessionCredentials } from "@/lib/server/session";
import { adminAccess } from "@/lib/auth/adminAccess";
import { isSuperAccessBul } from "@/lib/admin/apiBalance";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const RATE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

/**
 * GET /api/dashboard/admin/api-balance → vendor getapiLevelbalance. Checked server-side: admins and
 * accountants get everything; super access gets only BUL 0724, 5512, 6633 and 6752 (the wallet, the difference and
 * every other account are stripped here, not just hidden in the UI).
 */
export async function GET(request: Request) {
  const rate = checkRateLimit(`admin-api-balance:${getClientIp(request)}`, RATE_LIMIT);
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
  const access = adminAccess(credentials);
  if (access === "none") {
    return NextResponse.json({ error: "This is only available to administrators." }, { status: 403 });
  }

  const result = await fetchApiLevelBalance(credentials);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  const balance =
    access === "full"
      ? result.balance
      : { wallet: 0, diff: null, accounts: result.balance.accounts.filter((a) => isSuperAccessBul(a.key)) };

  return NextResponse.json({ ok: true, access, balance, fetchedAt: new Date().toISOString() });
}
