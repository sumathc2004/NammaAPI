"use server";

import { redirect } from "next/navigation";
import {
  apiFetch,
  createSession,
  deleteSession,
  readProblem,
  type AuthResponse,
  type ProblemDetails,
} from "@/lib/auth/session";

export type SignupValues = {
  companyName: string;
  businessEmail: string;
  phoneNumber: string;
  businessType: string;
  acceptTerms: boolean;
};

export type SignupState = {
  values: SignupValues;
  errors: Partial<Record<keyof SignupValues | "password", string>>;
  message?: string;
};

const UNAVAILABLE = "We couldn't reach the server. Please try again in a moment.";

/** First message per field from an ASP.NET validation problem. */
function fieldErrors<K extends string>(problem: ProblemDetails): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const [field, messages] of Object.entries(problem.errors ?? {})) out[field as K] = messages[0];
  return out;
}

async function call(path: string, body: unknown): Promise<Response | null> {
  try {
    return await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
  } catch {
    return null;
  }
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const values: SignupValues = {
    companyName: String(formData.get("companyName") ?? "").trim(),
    businessEmail: String(formData.get("businessEmail") ?? "").trim(),
    phoneNumber: String(formData.get("phoneNumber") ?? "").trim(),
    businessType: String(formData.get("businessType") ?? ""),
    acceptTerms: formData.get("acceptTerms") === "on",
  };
  const password = String(formData.get("password") ?? "");

  const errors: SignupState["errors"] = {};
  if (!values.companyName) errors.companyName = "Company name is required.";
  if (!/^\S+@\S+\.\S+$/.test(values.businessEmail)) errors.businessEmail = "Enter a valid business email.";
  if (!/^[0-9+\-\s]{7,15}$/.test(values.phoneNumber)) errors.phoneNumber = "Enter a valid phone number.";
  if (password.length < 8) errors.password = "Password must be at least 8 characters.";
  if (!values.businessType) errors.businessType = "Please select a business type.";
  if (!values.acceptTerms) errors.acceptTerms = "You must accept the Terms & Conditions.";
  if (Object.keys(errors).length > 0) return { values, errors };

  const res = await call("/api/auth/register", { ...values, password });
  if (!res) return { values, errors: {}, message: UNAVAILABLE };

  if (!res.ok) {
    const problem = await readProblem(res);
    const errs = fieldErrors<keyof SignupState["errors"]>(problem);
    return {
      values,
      errors: errs,
      message: Object.keys(errs).length ? undefined : (problem.detail ?? "Could not create your account."),
    };
  }

  await createSession((await res.json()) as AuthResponse);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login?loggedOut=1");
}
