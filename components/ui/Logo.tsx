import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";

type LogoProps = {
  variant?: "color" | "white";
  /** Where the logo links to; the dashboard points it at /dashboard. */
  href?: string;
  className?: string;
  priority?: boolean;
};

// public/logo.png (light backgrounds) and public/logo-white.png (dark/navy
// backgrounds) — replace these two files to update the logo site-wide.
export function Logo({ variant = "color", href = "/", className, priority = false }: LogoProps) {
  const src = variant === "white" ? "/logo-white.png" : "/logo.png";

  return (
    <Link href={href} className={cn("flex items-center", className)} aria-label={href === "/" ? "NammaAPI home" : "NammaAPI dashboard"}>
      <Image src={src} alt="NammaAPI" width={1024} height={274} priority={priority} className="h-9 w-auto" />
    </Link>
  );
}
