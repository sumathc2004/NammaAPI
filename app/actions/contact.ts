"use server";

import { apiFetch, readProblem } from "@/lib/auth/session";

export type ContactPayload = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  phoneNumber: string;
  monthlyVolume: string;
  requiredServices: string[];
  message: string;
};

export type ContactResult = {
  ok: boolean;
  errors?: Partial<Record<keyof ContactPayload, string>>;
  message?: string;
};

export async function submitContact(payload: ContactPayload): Promise<ContactResult> {
  let res: Response;
  try {
    res = await apiFetch("/api/contact", { method: "POST", body: JSON.stringify(payload) });
  } catch {
    return { ok: false, message: "We couldn't reach the server. Please try again in a moment." };
  }
  if (res.ok) return { ok: true };

  const problem = await readProblem(res);
  const errors: ContactResult["errors"] = {};
  for (const [field, messages] of Object.entries(problem.errors ?? {})) {
    errors[field as keyof ContactPayload] = messages[0];
  }
  return { ok: false, errors, message: problem.errors ? undefined : "Could not send your message. Please try again." };
}
