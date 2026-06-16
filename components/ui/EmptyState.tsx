import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function EmptyState({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <BookOpen className="h-8 w-8 text-sage" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-[#6d6257]">{children}</p>
      </div>
    </Card>
  );
}
