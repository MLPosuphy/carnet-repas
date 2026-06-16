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
    neutral: "bg-cream text-ink",
    green: "bg-[#e2eadf] text-[#425c43]",
    red: "bg-[#f2ded9] text-[#8c3c2b]",
    blue: "bg-[#dfe5f0] text-[#34486c]",
    gold: "bg-[#efe3ca] text-[#725421]"
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
