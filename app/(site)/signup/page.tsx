import { buildMetadata } from "@/lib/metadata";
import { SignupForm } from "./SignupForm";
import { Logo } from "@/components/ui/Logo";

export const metadata = buildMetadata({
  title: "Create Your Business Account",
  description: "Create a NammaAPI business account to start integrating payout, payment and salary APIs.",
  path: "/signup",
  noIndex: true,
});

export default function SignupPage() {
  return (
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-brand-light px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-brand-border bg-white p-8 shadow-lg shadow-brand-navy/5 sm:p-10">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-text-primary">Create your business account</h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Get sandbox access and start integrating in minutes.
        </p>
        <div className="mt-8">
          <SignupForm />
        </div>
      </div>
    </section>
  );
}
