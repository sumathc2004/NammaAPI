// PROTOTYPE login state for the UI. After the OTP matches, the profile (phone number and balances,
// never credentials) is kept in localStorage for a full day, so closing the tab or browser doesn't
// log you out. It is not authentication: the real authority is the encrypted session cookie
// (lib/server/session.ts), which lives for the same time.

/** How long a login lasts: the cookie's lifetime and the stored profile's lifetime. */
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

export type AepsProfile = {
  userName: string;
  balance: string;
  /** Main (debit) wallet, shown as "Debit balance" in the dashboard navbar. */
  walletBalance: string;
  /** Credit wallet, shown as "Credit balance". Missing from sessions saved before it was added. */
  creditBalance?: string;
  aepsBalance: string;
  bbpsBalance: string;
  cmsBalance: string;
  /** Shows admin-only sidebar sections. UI only — admin APIs must check the session cookie instead. */
  isAdmin?: boolean;
};

const STORAGE_KEY = "namma-demo-session";

export function saveDemoSession(profile: AepsProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 }));
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — the dashboard will send the user back to login.
  }
}

export function clearDemoSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Raw stored value (null once a day has passed), for useSyncExternalStore: a stable primitive, not a fresh object. */
export function readDemoSessionRaw(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isExpired(raw) ? null : raw;
  } catch {
    return null;
  }
}

function isExpired(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const { expiresAt } = JSON.parse(raw) as { expiresAt?: unknown };
    return typeof expiresAt !== "number" || expiresAt < Date.now();
  } catch {
    return true;
  }
}

export function parseDemoSession(raw: string | null | undefined): AepsProfile | null {
  if (!raw || isExpired(raw)) return null;
  try {
    const value = JSON.parse(raw) as Partial<AepsProfile>;
    return typeof value?.userName === "string" ? (value as AepsProfile) : null;
  } catch {
    return null;
  }
}

export function subscribeDemoSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
