"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { businessTypeOptions } from "@/lib/data/leadOptions";
import { isValidEmail, isValidPhone } from "@/lib/validation/fields";

type FormState = {
  companyName: string;
  businessEmail: string;
  phoneNumber: string;
  password: string;
  businessType: string;
  acceptTerms: boolean;
};

const initialState: FormState = {
  companyName: "",
  businessEmail: "",
  phoneNumber: "",
  password: "",
  businessType: "",
  acceptTerms: false,
};

export function SignupForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [attempted, setAttempted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim()) next.companyName = "Company name is required.";
    if (!isValidEmail(form.businessEmail.trim())) next.businessEmail = "Enter a valid business email.";
    if (!isValidPhone(form.phoneNumber.trim())) next.phoneNumber = "Enter a valid phone number.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (!form.businessType) next.businessType = "Please select a business type.";
    if (!form.acceptTerms) next.acceptTerms = "You must accept the Terms & Conditions.";
    setErrors(next);
    if (Object.keys(next).length === 0) setAttempted(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormInput
        label="Company Name"
        required
        autoComplete="organization"
        value={form.companyName}
        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        error={errors.companyName}
        placeholder="Acme Pvt Ltd"
      />
      <FormInput
        label="Business Email"
        type="email"
        required
        autoComplete="email"
        value={form.businessEmail}
        onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
        error={errors.businessEmail}
        placeholder="you@company.com"
      />
      <FormInput
        label="Phone Number"
        type="tel"
        required
        autoComplete="tel"
        value={form.phoneNumber}
        onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
        error={errors.phoneNumber}
        placeholder="+91 98765 43210"
      />
      <FormInput
        label="Password"
        type="password"
        required
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        error={errors.password}
        hint="At least 8 characters."
        placeholder="••••••••"
      />
      <FormSelect
        label="Business Type"
        required
        options={businessTypeOptions}
        placeholder="Select business type"
        value={form.businessType}
        onChange={(e) => setForm({ ...form, businessType: e.target.value })}
        error={errors.businessType}
      />

      <div>
        <label className="flex items-start gap-2.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 accent-brand-primary"
            checked={form.acceptTerms}
            onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
          />
          <span>
            I accept the{" "}
            <Link href="/legal/terms" className="font-medium text-brand-primary hover:text-brand-dark">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="font-medium text-brand-primary hover:text-brand-dark">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full">
        Create Account
      </Button>

      {attempted && (
        <p className="rounded-lg border border-brand-border bg-brand-light px-4 py-3 text-xs text-text-secondary">
          This is a demo UI — account creation is not yet connected to a backend. Once the ASP.NET Core API is
          integrated, this form will create your business account.
        </p>
      )}

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-primary hover:text-brand-dark">
          Log in
        </Link>
      </p>
    </form>
  );
}
