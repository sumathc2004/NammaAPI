"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Hides the marketing header/footer inside the signed-in dashboard, which has its own shell. */
export function HideInApp({ children }: { children: ReactNode }) {
  return usePathname().startsWith("/dashboard") ? null : children;
}
