"use client";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]" data-swipe-lock="true">
      <button
        type="button"
        aria-label="关闭确认框"
        className="absolute inset-0 bg-black/40"
        onClick={loading ? undefined : onCancel}
      />
      <div className="absolute inset-x-0 top-1/2 mx-auto w-[calc(100%-2rem)] max-w-sm -translate-y-1/2 rounded-2xl border bg-background p-4 shadow-xl">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="h-10 rounded-xl"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "处理中..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
