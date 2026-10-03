// PROTOTYPE login state. After the OTP matches, the logged-in profile is kept in this tab's
// sessionStorage so the dashboard can read it. Anyone can edit sessionStorage from devtools,
// so this is a demo convenience, not authentication — replace with a server session before
// real users log in.

export type AepsProfile = {
  userName: string;
  balance: string;
  walletBalance: string;
  aepsBalance: string;
  bbpsBalance: string;
  cmsBalance: string;
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
