"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info", durationMs = 2200) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setItems((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => remove(id), durationMs);
    },
    [remove],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] mx-auto w-full max-w-md px-4">
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-center justify-between rounded-xl border px-3 py-2 text-sm shadow ${
                item.kind === "success"
                  ? "border-accent bg-accent/35"
                  : item.kind === "error"
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border bg-card/95"
              }`}
            >
              <span>{item.message}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="ml-2 rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="关闭提示"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
