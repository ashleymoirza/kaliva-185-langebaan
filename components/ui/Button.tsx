import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "whatsapp"
  | "accent"
  | "stripe-primary"
  | "stripe-ghost"
  | "circle";

export type LinkVariant = Exclude<ButtonVariant, "circle">;
export type Size = "sm" | "md" | "lg" | "xl";

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:pointer-events-none";

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2",
  xl: "px-9 py-4.5 text-lg gap-2.5",
};

const VARIANTS: Record<LinkVariant, string> = {
  // Airbnb-style primary (near-black)
  primary: "rounded-xl bg-airbnb-text text-white hover:bg-brand-600 shadow-sm hover:shadow-card-hover",
  // Airbnb-style secondary (light surface)
  secondary: "rounded-xl bg-airbnb-surface text-airbnb-text hover:bg-airbnb-border shadow-sm hover:shadow-card-hover",
  ghost: "rounded-xl text-brand-700 hover:bg-brand-50",
  outline: "rounded-xl border border-brand-300 text-brand-700 hover:bg-brand-50 hover:border-brand-400",
  whatsapp: "rounded-xl bg-[#25D366] text-white hover:bg-[#1ebe5b] shadow-sm hover:shadow-card-hover",
  accent: "rounded-xl bg-accent-500 text-white hover:bg-accent-600 shadow-sm hover:shadow-card-hover",
  // Stripe-style precision buttons
  "stripe-primary": "rounded-[4px] bg-brand-600 text-white hover:bg-brand-700 font-stripe",
  "stripe-ghost": "rounded-[4px] border border-stripe-border-focus bg-transparent text-brand-600 hover:bg-[rgba(83,58,253,0.05)] font-stripe",
};

const circleStyles =
  "inline-flex items-center justify-center w-11 h-11 rounded-full bg-airbnb-surface text-airbnb-text shadow-airbnb-card hover:shadow-airbnb-hover active:scale-[0.92] transition-all duration-150";

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: Size; children: ReactNode }) {
  if (variant === "circle") {
    return (
      <button className={cn(circleStyles, className)} {...props}>
        {children}
      </button>
    );
  }

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
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: LinkVariant; size?: Size; children: ReactNode }) {
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