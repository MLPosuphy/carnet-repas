import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-24 w-full rounded-md border border-[#d7cdbb] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#8f8171]",
        className
      )}
      {...props}
    />
  );
}
