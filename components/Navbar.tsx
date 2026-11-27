"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_LINKS, SITE } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LinkButton } from "@/components/ui/Button";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-200",
        scrolled
          ? "glass border-b border-brand-100 shadow-sticky"
          : "bg-white border-b border-brand-100"
      )}
      onScroll={() => setScrolled(window.scrollY > 10)}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setOpen(false)} aria-label={`${SITE.name} - Home`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 font-bold text-white shadow-lg">
            K
          </span>
          <span className="leading-tight hidden sm:block">
            <span className="block text-sm font-bold text-slate-900 tracking-tight">{SITE.shortName}</span>
            <span className="block text-[10px] text-slate-500 font-medium">{SITE.resort}</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150",
                  pathname === link.href
                    ? "bg-brand-50 text-brand-800 shadow-sm"
                    : "text-slate-600 hover:text-brand-800 hover:bg-brand-50"
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:block">
          <LinkButton href="/book" size="lg" variant="primary">
            Book your stay
          </LinkButton>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="grid h-11 w-11 place-items-center rounded-xl text-slate-700 md:hidden hover:bg-brand-50"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-brand-100 bg-white md:hidden animate-slide-down">
          <ul className="mx-auto flex w-full max-w-7xl flex-col px-4 py-4 gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                    pathname === link.href
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-700 hover:bg-brand-50 hover:text-brand-800"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <LinkButton href="/book" size="lg" variant="primary" className="w-full" onClick={() => setOpen(false)}>
                Book your stay
              </LinkButton>
            </li>
          </ul>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 200ms ease-out;
        }
      `}</style>
    </header>
  );
}