"use client";

import Link from "next/link";
import { Bell, Lock, LogIn, LogOut, Pencil, UserRound, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { FadeIn } from "@/components/common/fade-in";
import { useToast } from "@/components/feedback/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertNickname } from "@/services/profile.service";

const placeholderItems = [{ icon: Lock, text: "隐私设置（即将开放）" }];

function defaultNameFromAuth(nickname: string | null, email?: string | null) {
  if (nickname?.trim()) {
    return nickname.trim();
  }

  const prefix = email?.split("@")[0]?.trim();
  if (prefix) {
    return prefix;
  }

  return "顺顺用户";
}

export default function MePage() {
  const { isLoading, isGuest, nickname, user, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const displayName = useMemo(
    () => defaultNameFromAuth(nickname, user?.email),
    [nickname, user?.email],
  );

  const handleSaveNickname = async () => {
    if (!user) {
      return;
    }

    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      showToast("请填写昵称", "error");
      return;
    }

    if (trimmed.length > 32) {
      showToast("昵称最多 32 字", "error");
      return;
    }

    setSavingNickname(true);
    const supabase = getSupabaseBrowserClient();
    const result = await upsertNickname(supabase, {
      userId: user.id,
      nickname: trimmed,
    });
    setSavingNickname(false);

    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }

    await refreshProfile();
    showToast("昵称已更新", "success");
    setNicknameOpen(false);
  };

  return (
    <section className="space-y-4">
      <FadeIn>
        <Card className="toy-hero py-0">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-[var(--toy-ink)]">
                {isLoading
                  ? "读取状态中..."
                : isGuest
                  ? "当前为游客模式"
                  : `你好，${displayName}`}
              </p>
              {!isLoading && !isGuest ? (
                <Button
                  className="toy-btn-secondary h-10 gap-1 px-3"
                  onClick={() => {
                    setNicknameInput(displayName);
                    setNicknameOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                  修改昵称
                </Button>
              ) : null}
            </div>

            {!isLoading && isGuest ? (
              <>
                <p className="text-sm text-[color:rgba(92,74,65,0.75)]">
                  登录后可同步记录并保存个人设置。
                </p>
                <Button asChild className="toy-btn-primary h-11 w-full">
                  <Link href="/login">
                    <LogIn className="size-4" />
                    去登录
                  </Link>
                </Button>
              </>
            ) : null}

            {!isLoading && !isGuest ? (
              <Button
                className="toy-btn-secondary h-11 w-full"
                onClick={() => void signOut()}
              >
                <LogOut className="size-4" />
                退出登录
              </Button>
            ) : null}

            <Badge variant="secondary" className="rounded-full px-3 py-1">
              非医疗用途
            </Badge>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-3">
          <Card className="toy-card py-0">
            <CardContent className="p-0">
              <Link href="/settings/reminder" className="flex items-center gap-3 p-4">
                <span className="toy-icon-bubble p-2">
                  <Bell className="size-4 text-[#d58a54]" />
                </span>
                <span className="text-sm text-[var(--toy-ink)]">提醒设置</span>
              </Link>
            </CardContent>
          </Card>

          <Card className="toy-card py-0">
            <CardContent className="p-0">
              <Link href="/friends" className="flex items-center gap-3 p-4">
                <span className="toy-icon-bubble p-2">
                  <Users className="size-4 text-[#7e93d6]" />
                </span>
                <span className="text-sm text-[var(--toy-ink)]">噗友绑定</span>
              </Link>
            </CardContent>
          </Card>

          {placeholderItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.text} className="toy-card py-0">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="toy-icon-bubble p-2">
                    <Icon className="size-4 text-[#9994a8]" />
                  </span>
                  <span className="text-sm text-[var(--toy-ink)]">{item.text}</span>
                </CardContent>
              </Card>
            );
          })}

          <Card className="toy-card py-0">
            <CardContent className="p-0">
              <Link href="/non-medical" className="flex items-center gap-3 p-4">
                <span className="toy-icon-bubble p-2">
                  <UserRound className="size-4 text-[#6f9f87]" />
                </span>
                <span className="text-sm text-[var(--toy-ink)]">非医疗说明</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {nicknameOpen ? (
        <div className="fixed inset-0 z-50" data-swipe-lock="true">
          <div className="absolute inset-0 bg-black/35" onClick={() => setNicknameOpen(false)} aria-hidden />
          <motion.div
            initial={{ y: 70, opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2rem] border border-[#e6cfb2] bg-[#fffaf2] p-4 pb-6 shadow-xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#e7d7c2]" />
            <h2 className="mb-3 text-lg font-semibold text-[var(--toy-ink)]">修改昵称</h2>
            <div className="toy-note p-3">
              <input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#ebd7c1] bg-white/80 px-3 text-sm text-[var(--toy-ink)] outline-none"
                placeholder="给自己起个名字"
                maxLength={32}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="toy-btn-secondary h-11 flex-1" onClick={() => setNicknameOpen(false)}>
                取消
              </Button>
              <motion.div className="flex-1" whileTap={{ scale: 0.96 }}>
                <Button className="toy-btn-primary h-11 w-full" onClick={handleSaveNickname} disabled={savingNickname}>
                  {savingNickname ? "保存中..." : "保存昵称"}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
