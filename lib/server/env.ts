import "server-only";

/** Base URL for the AEPS login API, e.g. "https://nammapayments.in/v5bc/api/aeps". No trailing slash. */
export function getAepsApiBaseUrl(): string {
  const url = process.env.AEPS_API_BASE_URL;
  if (!url) {
    throw new Error("AEPS_API_BASE_URL is not set. Add it to .env.local and your hosting provider's environment variables.");
  }
  return url.replace(/\/+$/, "");
}
