import type { ReactNode } from "react";

/** Login: no website navbar, footer or chat widgets — just the page itself. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {children}
    </main>
  );
}
