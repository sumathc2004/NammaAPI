import { NextResponse } from "next/server";
import { Resend } from "resend";
import { businessTypeOptions, monthlyVolumeOptions, optionLabel } from "@/lib/data/leadOptions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validateContact } from "@/lib/validation/contact";

/** Generous ceiling for a legitimate submission (the message field alone is capped at 2,000 chars). */
const MAX_BODY_BYTES = 16 * 1024;
/** Per-IP submission allowance. */
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

const SEND_FAILED = "We couldn't send your message right now. Please try again shortly.";

export async function POST(request: Request) {
  const rate = checkRateLimit(`contact:${getClientIp(request)}`, RATE_LIMIT);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request body." }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Silently accept (and drop) spam-bot submissions that fill the hidden honeypot field.
  const honeypot = (body as Record<string, unknown> | null)?.website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const result = validateContact(body);
  if (!result.ok) {
    return NextResponse.json({ error: "Missing or invalid fields.", fields: result.errors }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL_TO;
  const fromEmail = process.env.CONTACT_EMAIL_FROM ?? "NammaAPI Website <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    console.error("Contact form is not configured: set RESEND_API_KEY and CONTACT_EMAIL_TO.");
    return NextResponse.json(
      { error: "The contact form isn't fully set up yet. Please try again later or reach us another way." },
      { status: 500 },
    );
  }

  const { companyName, businessType, contactPerson, businessEmail, phoneNumber, monthlyVolume, requiredServices, message } =
    result.data;

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: businessEmail,
      subject: `New sales inquiry — ${companyName}`,
      text: [
        `Company: ${companyName}`,
        `Business type: ${optionLabel(businessTypeOptions, businessType)}`,
        `Contact person: ${contactPerson}`,
        `Email: ${businessEmail}`,
        `Phone: ${phoneNumber}`,
        `Monthly transaction volume: ${optionLabel(monthlyVolumeOptions, monthlyVolume)}`,
        `Required services: ${requiredServices.length > 0 ? requiredServices.join(", ") : "—"}`,
        "",
        "Message:",
        message || "—",
      ].join("\n"),
    });

    if (error) {
      console.error("Resend rejected the email:", error);
      return NextResponse.json({ error: SEND_FAILED }, { status: 502 });
    }
  } catch (err) {
    console.error("Contact form email send failed:", err);
    return NextResponse.json({ error: SEND_FAILED }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
