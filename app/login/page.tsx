import { buildMetadata } from "@/lib/metadata";
import { LoginForm } from "@/app/login/LoginForm";
import { Logo } from "@/components/ui/Logo";

export const metadata = buildMetadata({
  title: "Login",
  description: "Log in to your NammaAPI business dashboard with your phone number and password.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-brand-light px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-8 shadow-lg shadow-brand-navy/5 sm:p-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-text-primary">Log in to your account</h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Enter your phone number and password, then confirm with your one-time password.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
