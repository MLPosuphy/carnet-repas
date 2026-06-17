import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-11 w-full rounded-md border border-hairline bg-canvas px-4 text-sm text-ink placeholder:text-muted-soft",
        className
      )}
      {...props}
    />
  );
}
