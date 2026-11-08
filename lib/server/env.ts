import "server-only";

/** Base URL for the AEPS login API, e.g. "https://nammapayments.in/v5bc/api/aeps". No trailing slash. */
export function getAepsApiBaseUrl(): string {
  const url = process.env.AEPS_API_BASE_URL;
  if (!url) {
    throw new Error("AEPS_API_BASE_URL is not set. Add it to .env.local and your hosting provider's environment variables.");
  }
  return url.replace(/\/+$/, "");
}

/** Base URL for the vendor's client API (transfer reports), e.g. "https://nammapayments.in/apiclient/api". No trailing slash. */
export function getClientApiBaseUrl(): string {
  const url = process.env.CLIENT_API_BASE_URL;
  if (!url) {
    throw new Error("CLIENT_API_BASE_URL is not set. Add it to .env.local and your hosting provider's environment variables.");
  }
  return url.replace(/\/+$/, "");
}

/**
 * The vendor's cards API, used until CARDS_API_BASE_URL is set on the host. This file is server-only, so the
 * address never reaches the browser.
 */
const DEFAULT_CARDS_API_BASE_URL = "http://172.198.160.73/clients/api";

/** Base URL for the vendor's cards API (credit-card bill payments): CARDS_API_BASE_URL, else the built-in default. No trailing slash. */
export function getCardsApiBaseUrl(): string {
  const url = process.env.CARDS_API_BASE_URL || DEFAULT_CARDS_API_BASE_URL;
  return url.replace(/\/+$/, "");
}

/**
 * Key material for encrypting the session cookie (lib/server/session.ts). Required in every
 * environment; anyone who knows it can decrypt stored credentials, so never commit it.
 * Generate one with: openssl rand -hex 32
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is not set or is shorter than 32 characters. Generate one with `openssl rand -hex 32`.");
  }
  return secret;
}
