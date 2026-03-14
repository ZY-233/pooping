"use client";

import type { ReactNode } from "react";

import { BottomTabNav } from "@/components/layout/bottom-tab-nav";
import { SwipeTabShell } from "@/components/layout/swipe-tab-shell";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background/95">
      <main className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5">
        <SwipeTabShell>{children}</SwipeTabShell>
      </main>
      <PwaInstallPrompt />
      <BottomTabNav />
    </div>
  );
}
