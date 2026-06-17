import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  tone = "neutral"
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "green" | "red" | "blue" | "gold";
}) {
  const tones = {
    neutral: "bg-surface-card text-ink",
    green: "bg-brand-mint text-ink",
    red: "bg-brand-coral text-ink",
    blue: "bg-brand-lavender text-ink",
    gold: "bg-brand-ochre text-ink"
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[13px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
