"use client";

import { useEffect, useState, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { primaryNav } from "@/lib/data/nav";
import { cn } from "@/lib/cn";

const MOBILE_MENU_ID = "mobile-menu";

function Chevron() {
  return (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // The header lives in the root layout and keeps its state across navigations,
  // so close any open menus whenever the route changes.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenMenu(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  function handleMenuBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpenMenu(null);
  }

  function handleMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") setOpenMenu(null);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo priority />

        <nav aria-label="Primary" className="hidden lg:flex lg:items-center lg:gap-1">
          {primaryNav.map((item) => {
            const isOpen = openMenu === item.label;
            const triggerClasses =
              "flex items-center gap-1 rounded-md px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:text-brand-primary";

            if (!item.items) {
              return (
                <Link key={item.label} href={item.href ?? "/"} className={triggerClasses}>
                  {item.label}
                </Link>
              );
            }

            const submenuId = `nav-submenu-${item.label.toLowerCase().replace(/\W+/g, "-")}`;

            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.label)}
                onMouseLeave={() => setOpenMenu(null)}
                // Link triggers navigate on activation, so keyboard users reach their submenu by focusing them.
                onFocus={item.href ? () => setOpenMenu(item.label) : undefined}
                onBlur={handleMenuBlur}
                onKeyDown={handleMenuKeyDown}
              >
                {item.href ? (
                  <Link href={item.href} className={triggerClasses}>
                    {item.label}
                    <Chevron />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={triggerClasses}
                    aria-expanded={isOpen}
                    aria-controls={submenuId}
                    // Hover has already opened the menu for mouse clicks (detail > 0), so only
                    // keyboard activation (detail === 0) toggles it closed.
                    onClick={(e) => setOpenMenu(isOpen && e.detail === 0 ? null : item.label)}
                  >
                    {item.label}
                    <Chevron />
                  </button>
                )}

                {isOpen && (
                  <div id={submenuId} className="absolute left-0 top-full w-72 pt-2">
                    <ul className="rounded-xl border border-brand-border bg-white p-2 shadow-xl shadow-brand-navy/5">
                      {item.items.map((sub) => (
                        <li key={sub.label}>
                          <Link
                            href={sub.href}
                            onClick={() => setOpenMenu(null)}
                            className="block rounded-lg px-3.5 py-2.5 transition-colors hover:bg-brand-light focus-visible:bg-brand-light"
                          >
                            <span className="block text-sm font-semibold text-text-primary">{sub.label}</span>
                            {sub.description && (
                              <span className="mt-0.5 block text-xs text-text-secondary">{sub.description}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-primary transition-colors hover:text-brand-primary"
          >
            Login
          </Link>
          <Button href="/signup" size="sm">
            Get Started
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-primary lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls={MOBILE_MENU_ID}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M5 5L17 17M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      <div
        id={MOBILE_MENU_ID}
        inert={!mobileOpen}
        className={cn(
          "overflow-hidden border-t border-brand-border bg-white transition-[max-height] duration-300 lg:hidden",
          mobileOpen ? "max-h-[80vh] overflow-y-auto" : "max-h-0",
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-1 px-4 py-4">
          {primaryNav.map((item) => (
            <div key={item.label} className="border-b border-brand-border/70 pb-2 last:border-b-0">
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  className="block px-1 py-2.5 text-sm font-semibold text-text-primary"
                >
                  {item.label}
                </Link>
              ) : (
                <p className="px-1 py-2.5 text-sm font-semibold text-text-primary">{item.label}</p>
              )}
              {item.items && (
                <div className="mb-2 flex flex-col gap-0.5 pl-3">
                  {item.items.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      onClick={closeMobile}
                      className="rounded-md px-1 py-2 text-sm text-text-secondary hover:text-brand-primary"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Button href="/login" variant="secondary" size="sm" onClick={closeMobile}>
              Login
            </Button>
            <Button href="/signup" size="sm" onClick={closeMobile}>
              Get Started
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
