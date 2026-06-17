import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LinkButton({
  href,
  children,
  variant = "primary",
  className
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const variants = {
    primary: "border border-ink bg-ink text-on-primary hover:bg-primary-active",
    secondary: "border border-hairline bg-canvas text-ink hover:bg-surface-card",
    ghost: "border border-transparent bg-transparent text-ink hover:bg-surface-card"
  };

  return (
    <Link
      href={href}
      className={cn(
        "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
