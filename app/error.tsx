"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-brand-light px-4 py-20">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">Something went wrong</h1>
        <p className="mt-4 text-text-secondary">
          We couldn&apos;t load this page. Please try again — if the problem continues, contact our team.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-text-secondary">Reference: {error.digest}</p>}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => retry()}>Try Again</Button>
          <Button href="/contact" variant="secondary">
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  );
}
