"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "jinri_shunshun_pwa_dismissed_at";
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function detectStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? "0");
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS;
  });
  const [installed, setInstalled] = useState(() => detectStandalone());

  useEffect(() => {
    if (installed) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [installed]);

  if (installed || hidden || !deferredPrompt) {
    return null;
  }

  const handleDismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, `${Date.now()}`);
    setHidden(true);
  };

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-md px-4"
      data-swipe-lock="true"
    >
      <div className="toy-card flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs text-[var(--toy-ink)]">可添加到主屏，打开更方便</p>
        <div className="flex items-center gap-2">
          <Button className="toy-btn-secondary h-8 px-2 text-xs" onClick={handleDismiss}>
            稍后
          </Button>
          <Button className="toy-btn-primary h-8 px-2 text-xs" onClick={() => void handleInstall()}>
            <Download className="size-3.5" />添加
          </Button>
        </div>
      </div>
    </div>
  );
}
