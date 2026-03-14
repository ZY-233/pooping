"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const timer = setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js");
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
