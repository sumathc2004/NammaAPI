"use client";

import { useEffect } from "react";
import "./globals.css";

// Replaces the root layout when it fails, so it renders its own <html>/<body> and can't rely on Header/Footer.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-brand-light px-4 font-sans antialiased">
        <title>Something went wrong | NammaAPI</title>
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Something went wrong</h1>
          <p className="mt-4 text-text-secondary">
            NammaAPI is temporarily unavailable. Please try again in a moment.
          </p>
          {error.digest && <p className="mt-2 font-mono text-xs text-text-secondary">Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
