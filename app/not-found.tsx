import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false },
};

// Unknown URLs render here inside the root layout only, so this page adds the website chrome itself.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex flex-1 items-center justify-center bg-brand-light px-4 py-20">
        <div className="max-w-lg text-center">
          <p className="font-mono text-sm font-semibold text-brand-primary">404</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Page not found</h1>
          <p className="mt-4 text-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Try one of these instead.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/">Go to Homepage</Button>
            <Button href="/developers" variant="secondary">
              API Documentation
            </Button>
            <Button href="/contact" variant="ghost">
              Contact Sales
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
