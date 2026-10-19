import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGNED_IN_COOKIE } from "@/lib/auth/constants";

// Clears a stale or expired session (server components can't delete cookies themselves).
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.nextUrl));
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(SIGNED_IN_COOKIE);
  return res;
}
