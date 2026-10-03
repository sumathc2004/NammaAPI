import { businessTypeOptions, monthlyVolumeOptions, serviceOptions } from "@/lib/data/leadOptions";
import { isValidEmail, isValidPhone, MAX_EMAIL_LENGTH, normalizeLine } from "@/lib/validation/fields";

export const CONTACT_LIMITS = {
  companyName: 120,
  contactPerson: 120,
  businessEmail: MAX_EMAIL_LENGTH,
  phoneNumber: 20,
  message: 2000,
} as const;

export type ContactInput = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  phoneNumber: string;
  monthlyVolume: string;
  requiredServices: string[];
  message: string;
};

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

export type ContactValidationResult = { ok: true; data: ContactInput } | { ok: false; errors: ContactErrors };

const businessTypes = new Set(businessTypeOptions.map((o) => o.value));
const monthlyVolumes = new Set(monthlyVolumeOptions.map((o) => o.value));
const services = new Set(serviceOptions);

const asString = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Validates and normalizes a contact submission. Runs in the browser for instant feedback
 * and again in /api/contact, which never trusts the client.
 */
export function validateContact(input: unknown): ContactValidationResult {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  const data: ContactInput = {
    companyName: normalizeLine(asString(raw.companyName)),
    businessType: asString(raw.businessType),
    contactPerson: normalizeLine(asString(raw.contactPerson)),
    businessEmail: asString(raw.businessEmail).trim(),
    phoneNumber: asString(raw.phoneNumber).trim(),
    monthlyVolume: asString(raw.monthlyVolume),
    requiredServices: Array.isArray(raw.requiredServices)
      ? [...new Set(raw.requiredServices.filter((s): s is string => typeof s === "string"))]
      : [],
    message: asString(raw.message).trim(),
  };

  const errors: ContactErrors = {};

  if (!data.companyName) errors.companyName = "Company name is required.";
  else if (data.companyName.length > CONTACT_LIMITS.companyName)
    errors.companyName = `Keep the company name under ${CONTACT_LIMITS.companyName} characters.`;

  if (!businessTypes.has(data.businessType)) errors.businessType = "Please select a business type.";

  if (!data.contactPerson) errors.contactPerson = "Contact person is required.";
  else if (data.contactPerson.length > CONTACT_LIMITS.contactPerson)
    errors.contactPerson = `Keep the name under ${CONTACT_LIMITS.contactPerson} characters.`;

  if (!isValidEmail(data.businessEmail)) errors.businessEmail = "Enter a valid business email.";

  if (data.phoneNumber.length > CONTACT_LIMITS.phoneNumber || !isValidPhone(data.phoneNumber))
    errors.phoneNumber = "Enter a valid phone number.";

  if (!monthlyVolumes.has(data.monthlyVolume)) errors.monthlyVolume = "Please select a transaction volume.";

  if (data.requiredServices.some((s) => !services.has(s))) errors.requiredServices = "Select services from the list.";

  if (data.message.length > CONTACT_LIMITS.message)
    errors.message = `Keep your message under ${CONTACT_LIMITS.message} characters.`;

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
