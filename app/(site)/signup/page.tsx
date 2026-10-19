import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/metadata";
import { SignupForm } from "./SignupForm";
import { AuthCard } from "@/components/auth/AuthCard";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = buildMetadata({
  title: "Create Your Business Account",
  description: "Create a NammaAPI business account to start integrating payout, payment and salary APIs.",
  path: "/signup",
  noIndex: true,
});

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <AuthCard title="Create your business account" subtitle="Get sandbox access and start integrating in minutes.">
      <SignupForm />
    </AuthCard>
  );
}
