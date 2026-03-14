"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function LoginPage() {
  const { isGuest, isLoading, user, signOut, nickname } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const canSendOtp = trimmedEmail.length > 0 && isValidEmail(trimmedEmail);
  const canVerifyOtp = otp.length === 6 && !!sentToEmail;

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const sendOtp = async (targetEmail: string) => {
    setSendingOtp(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
    });

    setSendingOtp(false);

    if (error) {
      setErrorMessage(error.message);
      showToast(error.message, "error");
      return false;
    }

    setSentToEmail(targetEmail);
    setStep("otp");
    setOtp("");
    setResendCooldown(60);
    setMessage("验证码已发送，请去邮箱查看");
    showToast("验证码已发送，请去邮箱查看", "success");
    return true;
  };

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      setErrorMessage("请输入有效邮箱地址");
      showToast("请输入有效邮箱地址", "error");
      return;
    }

    await sendOtp(trimmedEmail);
  };

  const handleVerifyOtp = async () => {
    if (!canVerifyOtp || !sentToEmail) {
      setErrorMessage("请输入 6 位验证码");
      showToast("请输入 6 位验证码", "error");
      return;
    }

    setVerifyingOtp(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.verifyOtp({
      email: sentToEmail,
      token: otp,
      type: "email",
    });

    setVerifyingOtp(false);

    if (error) {
      setErrorMessage("验证失败，请重试");
      showToast(error.message || "验证失败，请重试", "error");
      return;
    }

    setMessage("验证成功，正在登录");
    showToast("验证并登录成功", "success");
    router.replace("/me");
  };

  const handleResendOtp = async () => {
    if (!sentToEmail || resendCooldown > 0 || sendingOtp) {
      return;
    }

    await sendOtp(sentToEmail);
  };

  const handleContinueAsGuest = async () => {
    setCreatingGuest(true);
    setMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const current = await supabase.auth.getSession();
    if (current.data.session?.user) {
      setCreatingGuest(false);
      router.replace("/");
      return;
    }

    const result = await supabase.auth.signInAnonymously();
    setCreatingGuest(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    showToast("已进入匿名体验", "success");
    router.replace("/");
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
              {isLoading ? "读取登录状态中..." : isGuest ? "邮箱验证码登录" : "你已登录"}
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
                {step === "email" ? (
                  <>
                    <label className="block space-y-1">
                      <span className="text-sm">输入邮箱</span>
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
                      disabled={sendingOtp || !canSendOtp}
                      onClick={handleSendOtp}
                    >
                      {sendingOtp ? "发送中..." : "发送验证码"}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-xl"
                      disabled={creatingGuest}
                      onClick={handleContinueAsGuest}
                    >
                      {creatingGuest ? "进入中..." : "继续体验（匿名）"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">验证码已发送至：{sentToEmail}</p>
                    <label className="block space-y-1">
                      <span className="text-sm">输入 6 位验证码</span>
                      <input
                        inputMode="numeric"
                        className="h-10 w-full rounded-lg border bg-background px-3 text-sm tracking-[0.25em]"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(normalizeOtp(e.target.value))}
                      />
                    </label>
                    <Button
                      className="h-10 w-full rounded-xl"
                      disabled={verifyingOtp || !canVerifyOtp}
                      onClick={handleVerifyOtp}
                    >
                      {verifyingOtp ? "验证中..." : "验证并登录"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl"
                        disabled={sendingOtp || resendCooldown > 0}
                        onClick={handleResendOtp}
                      >
                        {resendCooldown > 0 ? `${resendCooldown}s 后重发` : "重新发送"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl"
                        onClick={() => {
                          setStep("email");
                          setOtp("");
                          setMessage(null);
                          setErrorMessage(null);
                        }}
                      >
                        返回改邮箱
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : null}

            {!isLoading && !isGuest ? (
              <>
                <p className="text-sm text-muted-foreground">当前账号：{nickname || user?.email || "已登录用户"}</p>
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
            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
