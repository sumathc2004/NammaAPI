import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/ui/Logo";

export const metadata = buildMetadata({
  title: "Login",
  description: "Log in to your NammaAPI business dashboard with your phone number and password.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center bg-brand-light px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11 7H3M3 7L6.5 3.5M3 7L6.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to website
        </Link>

        <div className="rounded-2xl border border-brand-border bg-white p-8 shadow-lg shadow-brand-navy/5 sm:p-10">
          <div className="flex justify-center">
            <Logo priority />
          </div>
          <h1 className="mt-6 text-center text-2xl font-bold text-text-primary">Log in to your account</h1>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Enter your phone number and password, then confirm with your one-time password.
          </p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </section>
  );
}
