import { NextResponse } from "next/server";
import { clearSessionCredentials } from "@/lib/server/session";

/** Deletes the server-side session cookie (and with it the stored credentials). */
export async function POST() {
  await clearSessionCredentials();
  return NextResponse.json({ ok: true });
}
