// Who sees what. The vendor's login response carries three role flags — `isAdmin`, `isAccountant`
// and `isSuperAccess` — and each role has its own sidebar page (Admin, Accountant, Super Access).
// Client-safe: the UI uses it to pick what to show, and the server routes use it (on the session
// cookie's flags) for the check that actually counts.

export type AdminFlags = { isAdmin?: boolean; isAccountant?: boolean; isSuperAccess?: boolean };

/** The role-only sidebar pages. */
/** `adminOrAccountant` is for pages both of those roles share (Filing). */
export type PageRole = "admin" | "accountant" | "adminOrAccountant" | "superAccess";

/** Whether the account has the flag a role-only page needs. */
export function hasPageRole(flags: AdminFlags | null | undefined, role: PageRole): boolean {
  if (role === "admin") return flags?.isAdmin === true;
  if (role === "accountant") return flags?.isAccountant === true;
  if (role === "adminOrAccountant") return flags?.isAdmin === true || flags?.isAccountant === true;
  return flags?.isSuperAccess === true;
}

/**
 * Which PG tally collections an account may see:
 * - `all`: admins and accountants (the same) — every retailer on the platform.
 * - `own`: super access — only the collections of the retailer whose login number is the account's own.
 * - `none`: everyone else (retailers) — no PG tally at all.
 * The vendor's PgTallyReport has no per-client filter and returns the whole platform, so this is
 * enforced by our server (see the pg-tally routes).
 */
export type TallyScope = "all" | "own" | "none";

export function tallyScope(flags: AdminFlags | null | undefined): TallyScope {
  if (flags?.isAdmin === true || flags?.isAccountant === true) return "all";
  if (flags?.isSuperAccess === true) return "own";
  return "none";
}

/**
 * What an account may see in the admin APIs:
 * - `full`: everything (admins and accountants).
 * - `bul`: only the BUL total card with its accounts (super access).
 * - `none`: nothing.
 */
export type AdminAccess = "full" | "bul" | "none";

export function adminAccess(flags: AdminFlags | null | undefined): AdminAccess {
  if (flags?.isAdmin === true || flags?.isAccountant === true) return "full";
  if (flags?.isSuperAccess === true) return "bul";
  return "none";
}
