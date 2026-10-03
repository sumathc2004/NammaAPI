// PROTOTYPE login state for the UI. After the OTP matches, the profile (phone number and balances,
// never credentials) is kept in this tab's sessionStorage so the dashboard can show it. It is not
// authentication: the real authority is the encrypted session cookie (lib/server/session.ts).

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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — the dashboard will send the user back to login.
  }
}

export function clearDemoSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Raw stored value, for useSyncExternalStore (must return a stable primitive, not a fresh object). */
export function readDemoSessionRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseDemoSession(raw: string | null | undefined): AepsProfile | null {
  if (!raw) return null;
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
