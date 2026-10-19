import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SIGNED_IN_COOKIE } from "@/lib/auth/constants";

const API_URL = process.env.NAMMA_API_URL ?? "http://localhost:5080";

export type SessionUser = {
  id: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  businessType: string;
  createdAt: string;
  /** Namma Payments account snapshot from the last login. */
  nammaPayments: NammaPaymentsAccount | null;
};

export type NammaPaymentsAccount = {
  userName: string | null;
  balance: number | null;
  walletBalance: number | null;
  updatedAt: string;
};

export type AuthResponse = {
  token: string;
  expiresAt: string;
  user: SessionUser;
};

export type ProblemDetails = { detail?: string; errors?: Record<string, string[]> };

/** Server-side call to the ASP.NET Core API. Never import this from a client component. */
export function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
}

/** Like apiFetch, but sends the signed-in user's token. */
export async function authedFetch(path: string, init?: RequestInit) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  return apiFetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...init?.headers } });
}

export async function readProblem(res: Response): Promise<ProblemDetails> {
  try {
    return (await res.json()) as ProblemDetails;
  } catch {
    return {};
  }
}

export async function createSession({ token, expiresAt }: AuthResponse) {
  const store = await cookies();
  const options = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
  store.set(SESSION_COOKIE, token, { ...options, httpOnly: true });
  store.set(SIGNED_IN_COOKIE, "1", options);
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(SIGNED_IN_COOKIE);
}

/** Returns the signed-in user, or null if there is no valid session. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!(await cookies()).has(SESSION_COOKIE)) return null;

  try {
    const res = await authedFetch("/api/auth/me");
    return res.ok ? ((await res.json()) as SessionUser) : null;
  } catch {
    return null;
  }
});
