import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-[#d7cdbb] bg-white px-3 text-sm text-ink placeholder:text-[#8f8171]",
        className
      )}
      {...props}
    />
  );
}
