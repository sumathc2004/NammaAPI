"use client";

import { useState, type FormEvent } from "react";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/FormInput";
import { Button } from "@/components/ui/Button";

const businessTypes = [
  { value: "college", label: "College / Educational Institution" },
  { value: "travel", label: "Travel Company" },
  { value: "insurance", label: "Insurance Business" },
  { value: "ca-firm", label: "CA Firm" },
  { value: "corporate", label: "Corporate / Enterprise" },
  { value: "startup", label: "Startup / Technology Platform" },
  { value: "other", label: "Other" },
];

const volumeRanges = [
  { value: "lt-10l", label: "Less than ₹10 lakh" },
  { value: "10l-1cr", label: "₹10 lakh – ₹1 crore" },
  { value: "1cr-10cr", label: "₹1 crore – ₹10 crore" },
  { value: "gt-10cr", label: "More than ₹10 crore" },
];

const services = ["Payout API", "Payment Gateway / Collection", "Salary & Bulk Payments", "Payment Automation"];

type FormState = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  phoneNumber: string;
  monthlyVolume: string;
  requiredServices: string[];
  message: string;
  website: string; // honeypot — must stay empty
};

const initialState: FormState = {
  companyName: "",
  businessType: "",
  contactPerson: "",
  businessEmail: "",
  phoneNumber: "",
  monthlyVolume: "",
  requiredServices: [],
  message: "",
  website: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim()) next.companyName = "Company name is required.";
    if (!form.businessType) next.businessType = "Please select a business type.";
    if (!form.contactPerson.trim()) next.contactPerson = "Contact person is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.businessEmail)) next.businessEmail = "Enter a valid business email.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.phoneNumber)) next.phoneNumber = "Enter a valid phone number.";
    if (!form.monthlyVolume) next.monthlyVolume = "Please select a transaction volume.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      requiredServices: f.requiredServices.includes(service)
        ? f.requiredServices.filter((s) => s !== service)
        : [...f.requiredServices, service],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-primary/30 bg-brand-light p-8 text-center sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-text-primary">Thanks — we&apos;ve received your message</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          A member of our payments team will get back to you shortly.
        </p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setForm(initialState);
            setSubmitted(false);
          }}
        >
          Submit another response
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Honeypot — hidden from real users, bots tend to fill every field */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormInput
          label="Company Name"
          required
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          error={errors.companyName}
          placeholder="Acme Pvt Ltd"
        />
        <FormSelect
          label="Business Type"
          required
          options={businessTypes}
          placeholder="Select business type"
          value={form.businessType}
          onChange={(e) => setForm({ ...form, businessType: e.target.value })}
          error={errors.businessType}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormInput
          label="Contact Person"
          required
          value={form.contactPerson}
          onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
          error={errors.contactPerson}
          placeholder="Full name"
        />
        <FormInput
          label="Business Email"
          type="email"
          required
          value={form.businessEmail}
          onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
          error={errors.businessEmail}
          placeholder="you@company.com"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormInput
          label="Phone Number"
          type="tel"
          required
          value={form.phoneNumber}
          onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          error={errors.phoneNumber}
          placeholder="+91 98765 43210"
        />
        <FormSelect
          label="Monthly Transaction Volume"
          required
          options={volumeRanges}
          placeholder="Select a range"
          value={form.monthlyVolume}
          onChange={(e) => setForm({ ...form, monthlyVolume: e.target.value })}
          error={errors.monthlyVolume}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-text-primary">Required Services</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {services.map((service) => (
            <label
              key={service}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-brand-border px-3 py-2.5 text-xs font-medium text-text-primary transition-colors has-[:checked]:border-brand-primary has-[:checked]:bg-brand-light"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-brand-primary"
                checked={form.requiredServices.includes(service)}
                onChange={() => toggleService(service)}
              />
              {service}
            </label>
          ))}
        </div>
      </fieldset>

      <FormTextarea
        label="Message"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        placeholder="Tell us a bit about your business and what you're looking to build."
      />

      {submitError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
        {submitting ? "Sending…" : "Talk to Our Payments Team"}
      </Button>
    </form>
  );
}
