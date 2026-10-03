import "server-only";
import { XMLParser } from "fast-xml-parser";
import { getAepsApiBaseUrl } from "@/lib/server/env";

const REQUEST_TIMEOUT_MS = 20_000;

export const AEPS_UNAVAILABLE_ERROR = "The payments service is temporarily unavailable. Please try again shortly.";
export const AEPS_UNEXPECTED_ERROR = "The payments service returned an unexpected response. Please try again shortly.";

export type AepsResult = { ok: true; body: unknown } | { ok: false; error: string };

type AepsRequestOptions = {
  /** The vendor's "_api" endpoints are POST, with parameters still in the query string. */
  method?: "GET" | "POST";
  /** Response format to ask for; the vendor serves both XML and JSON. */
  prefer?: "xml" | "json";
};

const ACCEPT = {
  xml: "application/xml, text/xml, application/json;q=0.5",
  json: "application/json, application/xml;q=0.5",
};

// parseTagValue is off deliberately: numeric parsing would turn "0482" into 482 (breaking OTPs)
// and drop trailing zeros from amounts. Every value stays the exact string the vendor sent.
const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

/**
 * Calls `{AEPS_API_BASE_URL}/{endpoint}?{params}` and parses the body (JSON or XML, whichever the
 * vendor sends). Parameters always go in the query string — including the password, for both GET
 * and POST endpoints (the vendor's design) — so never log the URL built here.
 */
export async function aepsRequest(
  endpoint: string,
  params: Record<string, string>,
  { method = "GET", prefer = "xml" }: AepsRequestOptions = {},
): Promise<AepsResult> {
  const url = new URL(`${getAepsApiBaseUrl()}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let responseText: string;
  let contentType: string;
  try {
    const response = await fetch(url, {
      method,
      headers: { Accept: ACCEPT[prefer] },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    responseText = (await response.text()).trim();
    contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      console.error(`AEPS ${endpoint} returned HTTP ${response.status}.`);
      return { ok: false, error: AEPS_UNAVAILABLE_ERROR };
    }
  } catch (err) {
    console.error(`AEPS ${endpoint} request failed:`, err instanceof Error ? err.message : err);
    return { ok: false, error: AEPS_UNAVAILABLE_ERROR };
  }

  if (!responseText) return { ok: true, body: null };

  try {
    const isJson = contentType.includes("json") || /^[[{]/.test(responseText);
    return { ok: true, body: isJson ? JSON.parse(responseText) : xmlParser.parse(responseText) };
  } catch (err) {
    console.error(`AEPS ${endpoint} response could not be parsed:`, err instanceof Error ? err.message : err);
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }
}
