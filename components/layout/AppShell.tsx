"use client";

import {
  BookOpen,
  CalendarDays,
  Home,
  ListChecks,
  Plus,
  Refrigerator,
  ShoppingBasket
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/recipes", label: "Recettes", icon: BookOpen },
  { href: "/recipes/new", label: "Ajouter", icon: Plus },
  { href: "/chapters", label: "Chapitres", icon: ListChecks },
  { href: "/pantry", label: "Frigo", icon: Refrigerator },
  { href: "/shopping", label: "Courses", icon: ShoppingBasket },
  { href: "/meal-plan", label: "Planning", icon: CalendarDays }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3d8c7] bg-white/95 px-2 py-2 backdrop-blur md:inset-y-0 md:left-0 md:right-auto md:w-64 md:border-r md:border-t-0 md:px-4 md:py-5">
        <Link href="/" className="mb-8 hidden items-center gap-3 md:flex">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Recipe Book</span>
            <span className="block text-xs text-[#7c6e60]">Carnet culinaire</span>
          </span>
        </Link>
        <nav className="grid grid-cols-7 gap-1 md:grid-cols-1 md:gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "focus-ring flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium transition md:min-h-10 md:flex-row md:justify-start md:px-3 md:text-sm",
                  active
                    ? "bg-ink text-white"
                    : "text-[#5f554c] hover:bg-cream hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-24 pt-6 md:pl-72 md:pr-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
