import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "outline" | "whatsapp" | "accent";
export type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-card-hover",
  secondary: "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 hover:ring-brand-300",
  ghost: "text-brand-700 hover:bg-brand-50",
  outline: "border border-brand-300 text-brand-700 hover:bg-brand-50 hover:border-brand-400",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1ebe5b] shadow-sm hover:shadow-card-hover",
  accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm hover:shadow-card-hover",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2",
  xl: "px-9 py-4.5 text-lg gap-2.5",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; size?: Size; children: ReactNode }) {
  const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
  if (external) {
    return (
      <a className={cn(BASE, VARIANTS[variant], SIZES[size], className)} href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} href={href}>
      {children}
    </Link>
  );
}