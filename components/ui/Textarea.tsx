import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full rounded-md border border-hairline bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted-soft",
        className
      )}
      {...props}
    />
  );
}
