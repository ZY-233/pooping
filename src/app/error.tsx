"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <Card className="w-full rounded-2xl border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">出现了一个小问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            操作失败，请稍后重试。如果持续失败，请刷新页面。
          </p>
          <Button className="h-10 w-full rounded-xl" onClick={() => reset()}>
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
