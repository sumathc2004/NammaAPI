import { authedFetch } from "@/lib/auth/session";

export type ApiKey = { id: string; name: string; prefix: string; createdAt: string };

export async function listApiKeys(): Promise<ApiKey[]> {
  try {
    const res = await authedFetch("/api/keys");
    return res.ok ? ((await res.json()) as ApiKey[]) : [];
  } catch {
    return [];
  }
}
