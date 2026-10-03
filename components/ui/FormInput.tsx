"use client";

import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const fieldClasses =
  "w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/15";

const errorFieldClasses = "border-red-400 focus:border-red-500 focus:ring-red-500/15";

const errorId = (fieldId: string) => `${fieldId}-error`;
const hintId = (fieldId: string) => `${fieldId}-hint`;

/** Points assistive tech at whichever message (error or hint) is currently rendered under the field. */
function describedBy(fieldId: string, error?: string, hint?: string): string | undefined {
  if (error) return errorId(fieldId);
  if (hint) return hintId(fieldId);
  return undefined;
}

type FieldWrapperProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
};

function FieldWrapper({ label, htmlFor, required, error, hint, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-brand-primary"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId(htmlFor)} className="mt-1.5 text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(htmlFor)} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  ref?: Ref<HTMLInputElement>;
};

export function FormInput({ label, error, hint, id, required, className, ref, ...rest }: FormInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(fieldClasses, error && errorFieldClasses, className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function FormTextarea({ label, error, hint, id, required, className, ...rest }: FormTextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <textarea
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy(inputId, error, hint)}
        rows={4}
        className={cn(fieldClasses, "resize-none", error && errorFieldClasses, className)}
        {...rest}
      />
    </FieldWrapper>
  );
}

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function FormSelect({
  label,
  error,
  hint,
  id,
  required,
  className,
  options,
  placeholder,
  ...rest
}: FormSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} required={required} error={error} hint={hint}>
      <select
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(fieldClasses, error && errorFieldClasses, className)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
