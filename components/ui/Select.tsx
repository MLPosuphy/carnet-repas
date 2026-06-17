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
        "focus-ring h-11 w-full rounded-md border border-hairline bg-canvas px-4 text-sm text-ink",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
