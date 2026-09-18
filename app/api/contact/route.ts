import { NextResponse } from "next/server";
import { Resend } from "resend";

type ContactPayload = {
  companyName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  phoneNumber: string;
  monthlyVolume: string;
  requiredServices: string[];
  message: string;
  /** Honeypot field — real users never fill this in. */
  website?: string;
};

function isValidPayload(body: unknown): body is ContactPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.companyName === "string" &&
    b.companyName.trim().length > 0 &&
    typeof b.businessType === "string" &&
    b.businessType.trim().length > 0 &&
    typeof b.contactPerson === "string" &&
    b.contactPerson.trim().length > 0 &&
    typeof b.businessEmail === "string" &&
    /^\S+@\S+\.\S+$/.test(b.businessEmail) &&
    typeof b.phoneNumber === "string" &&
    /^[0-9+\-\s]{7,15}$/.test(b.phoneNumber) &&
    typeof b.monthlyVolume === "string" &&
    b.monthlyVolume.trim().length > 0 &&
    Array.isArray(b.requiredServices) &&
    typeof b.message === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Silently accept (and drop) spam-bot submissions that fill the hidden honeypot field.
  const honeypot = (body as Record<string, unknown> | null)?.website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return NextResponse.json({ ok: true });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
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
    body;

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: businessEmail,
      subject: `New sales inquiry — ${companyName}`,
      text: [
        `Company: ${companyName}`,
        `Business type: ${businessType}`,
        `Contact person: ${contactPerson}`,
        `Email: ${businessEmail}`,
        `Phone: ${phoneNumber}`,
        `Monthly transaction volume: ${monthlyVolume}`,
        `Required services: ${requiredServices.length > 0 ? requiredServices.join(", ") : "—"}`,
        "",
        "Message:",
        message.trim() || "—",
      ].join("\n"),
    });

    if (error) {
      console.error("Resend rejected the email:", error);
      return NextResponse.json({ error: "We couldn't send your message right now. Please try again shortly." }, { status: 502 });
    }
  } catch (err) {
    console.error("Contact form email send failed:", err);
    return NextResponse.json({ error: "We couldn't send your message right now. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
