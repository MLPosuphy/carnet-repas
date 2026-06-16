import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-[#d7cdbb] bg-white px-3 text-sm text-ink",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
