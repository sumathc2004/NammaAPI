// Who sees what. The vendor's login response carries three role flags — `isAdmin`, `isAccountant`
// and `isSuperAccess` — and each role has its own sidebar page (Admin, Accountant, Super Access).
// Client-safe: the UI uses it to pick what to show, and the server routes use it (on the session
// cookie's flags) for the check that actually counts.

export type AdminFlags = { isAdmin?: boolean; isAccountant?: boolean; isSuperAccess?: boolean };

/** The role-only sidebar pages. */
/** `adminOrAccountant` is for pages both of those roles share (Filing). */
/** `retailer` is a plain login: none of the three flags (it sees the pages everyone sees, plus its own PG Tally). */
export type PageRole = "admin" | "accountant" | "adminOrAccountant" | "superAccess" | "retailer";

/** Whether the account has the flag a role-only page needs. */
export function hasPageRole(flags: AdminFlags | null | undefined, role: PageRole): boolean {
  if (role === "admin") return flags?.isAdmin === true;
  if (role === "accountant") return flags?.isAccountant === true;
  if (role === "adminOrAccountant") return flags?.isAdmin === true || flags?.isAccountant === true;
  if (role === "retailer") return flags?.isAdmin !== true && flags?.isAccountant !== true && flags?.isSuperAccess !== true;
  return flags?.isSuperAccess === true;
}

/**
 * Which PG tally collections an account may see:
 * - `all`: admins — every retailer on the platform.
 * - `own`: everyone else (accountants, super access, retailers) — only the collections of the retailer
 *   whose login number is the account's own. The vendor's PgTallyReport has no per-client filter and
 *   returns the whole platform, so this is enforced by our server (see the pg-tally routes).
 */
export type TallyScope = "all" | "own";

export function tallyScope(flags: AdminFlags | null | undefined): TallyScope {
  return flags?.isAdmin === true ? "all" : "own";
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
