import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getAuthSecret } from "@/lib/server/env";

/**
 * Server-side login session. The vendor API needs the account's username and password on every
 * call, so after login they live in this cookie:
 * - encrypted with AES-256-GCM (AUTH_SECRET), so the value is unreadable and tamper-proof;
 * - httpOnly, so browser JavaScript can never read it.
 * The password is never sent back to the browser in any other form.
 */

const COOKIE_NAME = "namma_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type SessionCredentials = {
  userName: string;
  password: string;
  /** From the vendor's login response. The trustworthy admin check for server routes. */
  isAdmin: boolean;
};
type SessionPayload = SessionCredentials & { exp: number };

function encryptionKey(): Buffer {
  return createHash("sha256").update(getAuthSecret()).digest();
}

function encrypt(payload: SessionPayload): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function decrypt(value: string): SessionPayload | null {
  try {
    const raw = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plaintext = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCredentials(credentials: SessionCredentials) {
  const store = await cookies();
  store.set(COOKIE_NAME, encrypt({ ...credentials, exp: Date.now() + SESSION_TTL_SECONDS * 1000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** The logged-in account's credentials, or null when there's no valid, unexpired session. */
export async function getSessionCredentials(): Promise<SessionCredentials | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;

  const payload = decrypt(value);
  if (
    !payload ||
    typeof payload.userName !== "string" ||
    typeof payload.password !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < Date.now()
  ) {
    return null;
  }
  return { userName: payload.userName, password: payload.password, isAdmin: payload.isAdmin === true };
}

export async function clearSessionCredentials() {
  (await cookies()).delete(COOKIE_NAME);
}
