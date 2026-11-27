import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

const SIZES: Record<ContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

const BASE = "mx-auto w-full px-4 sm:px-6 lg:px-8";

export default function Container({
  children,
  className,
  as: As = "div",
  size = "lg",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "header" | "footer";
  size?: ContainerSize;
}) {
  return (
    <As className={cn(BASE, SIZES[size], className)}>{children}</As>
  );
}