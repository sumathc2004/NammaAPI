"use client";

import { useActionState } from "react";
import Link from "next/link";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";
import { signup, type SignupState } from "@/app/actions/auth";

const businessTypes = [
  { value: "college", label: "College / Educational Institution" },
  { value: "travel", label: "Travel Company" },
  { value: "insurance", label: "Insurance Business" },
  { value: "ca-firm", label: "CA Firm" },
  { value: "corporate", label: "Corporate / Enterprise" },
  { value: "startup", label: "Startup / Technology Platform" },
  { value: "other", label: "Other" },
];

const initialState: SignupState = {
  values: { companyName: "", businessEmail: "", phoneNumber: "", businessType: "", acceptTerms: false },
  errors: {},
};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);
  const { values, errors } = state;

  return (
    // key remounts the fields with the submitted values after React resets the form
    <form key={JSON.stringify(values)} action={formAction} noValidate className="space-y-5">
      {state.message && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <FormInput
        label="Company Name"
        name="companyName"
        required
        defaultValue={values.companyName}
        error={errors.companyName}
        placeholder="Acme Pvt Ltd"
      />
      <FormInput
        label="Business Email"
        name="businessEmail"
        type="email"
        required
        autoComplete="email"
        defaultValue={values.businessEmail}
        error={errors.businessEmail}
        placeholder="you@company.com"
      />
      <FormInput
        label="Phone Number"
        name="phoneNumber"
        type="tel"
        required
        defaultValue={values.phoneNumber}
        error={errors.phoneNumber}
        placeholder="+91 98765 43210"
      />
      <FormInput
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        error={errors.password}
        hint="At least 8 characters."
        placeholder="••••••••"
      />
      <FormSelect
        label="Business Type"
        name="businessType"
        required
        options={businessTypes}
        placeholder="Select business type"
        defaultValue={values.businessType}
        error={errors.businessType}
      />

      <div>
        <label className="flex items-start gap-2.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-0.5 h-3.5 w-3.5 accent-brand-primary"
            defaultChecked={values.acceptTerms}
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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create Account"}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-primary hover:text-brand-dark">
          Log in
        </Link>
      </p>
    </form>
  );
}
