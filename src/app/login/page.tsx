"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const { isGuest, isLoading, user, signOut, nickname } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const canSubmit = trimmedEmail.length > 0 && isValidEmail(trimmedEmail);

  const submitMagicLink = async () => {
    if (!canSubmit) {
      setErrorMessage("请输入有效邮箱地址");
      showToast("请输入有效邮箱地址", "error");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      showToast(error.message, "error");
      return;
    }

    setMessage("登录邮件已发送，请前往邮箱点击 Magic Link。");
    showToast("Magic Link 已发送，请检查邮箱。", "success");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-6">
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">账号体系</p>
          <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isLoading
                ? "读取登录状态中..."
                : isGuest
                  ? "Magic Link 邮箱登录"
                  : "你已登录"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : null}

            {!isLoading && isGuest ? (
              <>
                <label className="block space-y-1">
                  <span className="text-sm">邮箱</span>
                  <input
                    type="email"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <Button
                  className="h-10 w-full rounded-xl"
                  disabled={submitting || !canSubmit}
                  onClick={submitMagicLink}
                >
                  {submitting ? "发送中..." : "发送 Magic Link"}
                </Button>
              </>
            ) : null}

            {!isLoading && !isGuest ? (
              <>
                <p className="text-sm text-muted-foreground">
                  当前账号：{nickname || user?.email || "已登录用户"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-10 rounded-xl">
                    <Link href="/me">回到我的</Link>
                  </Button>
                  <Button className="h-10 rounded-xl" onClick={() => void signOut()}>
                    退出登录
                  </Button>
                </div>
              </>
            ) : null}

            {message ? <p className="text-sm text-primary">{message}</p> : null}
            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
