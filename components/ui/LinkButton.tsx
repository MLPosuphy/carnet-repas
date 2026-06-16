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
    primary: "bg-ink text-white hover:bg-[#3a342f]",
    secondary: "bg-cream text-ink hover:bg-[#e8dfcf]",
    ghost: "bg-transparent text-ink hover:bg-cream"
  };

  return (
    <Link
      href={href}
      className={cn(
        "focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
