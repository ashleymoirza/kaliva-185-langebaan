import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "outline" | "brand" | "accent";
export type BadgeSize = "sm" | "md" | "lg";

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-sand-100 text-sand-800",
  success: "bg-success-50 text-success-700 border border-success-200",
  warning: "bg-warning-50 text-warning-600 border border-warning-200",
  error: "bg-error-50 text-error-700 border border-error-200",
  outline: "bg-transparent text-slate-700 ring-1 ring-slate-200",
  brand: "bg-brand-50 text-brand-800 ring-1 ring-brand-100",
  accent: "bg-accent-50 text-accent-800 ring-1 ring-accent-100",
};

const SIZES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-3 py-1 text-xs gap-1.5",
  lg: "px-4 py-1.5 text-sm gap-2",
};

const BASE = "inline-flex items-center rounded-[14px] font-medium ring-1 font-airbnb";

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: { children: ReactNode; variant?: BadgeVariant; size?: BadgeSize; className?: string }) {
  return (
    <span className={cn(BASE, VARIANTS[variant], SIZES[size], className)}>{children}</span>
  );
}