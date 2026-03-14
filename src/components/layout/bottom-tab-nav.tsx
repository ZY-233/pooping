"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "首页", icon: House },
  { href: "/calendar", label: "日历", icon: CalendarDays },
  { href: "/me", label: "我的", icon: UserRound },
];

export function BottomTabNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t bg-background/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      <ul className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs transition",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
