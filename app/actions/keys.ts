"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authedFetch, readProblem } from "@/lib/auth/session";

export type CreateKeyState = {
  error?: string;
  /** Full secret, shown to the user exactly once. */
  created?: { name: string; secret: string };
};

export async function createApiKey(_prev: CreateKeyState, formData: FormData): Promise<CreateKeyState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the key a name, e.g. \"Production server\"." };

  let res: Response;
  try {
    res = await authedFetch("/api/keys", { method: "POST", body: JSON.stringify({ name }) });
  } catch {
    return { error: "We couldn't reach the server. Please try again in a moment." };
  }
  if (res.status === 401) redirect("/auth/signout");
  if (!res.ok) {
    const problem = await readProblem(res);
    return { error: problem.errors?.name?.[0] ?? problem.detail ?? "Could not create the key." };
  }

  const { secret } = (await res.json()) as { secret: string };
  revalidatePath("/dashboard/api-keys");
  return { created: { name, secret } };
}

export async function revokeApiKey(id: string): Promise<{ error?: string }> {
  let res: Response;
  try {
    res = await authedFetch(`/api/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    return { error: "We couldn't reach the server. Please try again in a moment." };
  }
  if (res.status === 401) redirect("/auth/signout");
  if (!res.ok && res.status !== 404) return { error: "Could not revoke the key. Please try again." };

  revalidatePath("/dashboard/api-keys");
  return {};
}
