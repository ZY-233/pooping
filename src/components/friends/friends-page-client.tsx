"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Pencil, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteFriendAlias,
  getFriendAlias,
  resolveFriendDisplayName,
  upsertFriendAlias,
} from "@/services/friend-alias.service";
import {
  acceptFriendInvite,
  createFriendInvite,
  getFriendBindingSnapshot,
  removeFriendRelation,
  type FriendBindingSnapshot,
} from "@/services/friend.service";
import {
  getOrCreateVisibilitySettings,
  updateVisibilitySettings,
} from "@/services/friend-visibility.service";
import { getRelationPeerProfile } from "@/services/profile.service";

type VisibilityForm = {
  shareHasRecord: boolean;
  shareRecordTime: boolean;
  shareShape: boolean;
  shareNote: boolean;
};

const defaultVisibility: VisibilityForm = {
  shareHasRecord: true,
  shareRecordTime: false,
  shareShape: false,
  shareNote: false,
};

function getPeerUserId(relation: FriendBindingSnapshot["activeRelation"], userId: string) {
  if (!relation) {
    return null;
  }
  return relation.user_id === userId ? relation.friend_user_id : relation.user_id;
}

export function FriendsPageClient() {
  const { isLoading, isGuest, user } = useAuth();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get("invite") ?? "";

  const [snapshot, setSnapshot] = useState<FriendBindingSnapshot | null>(null);
  const [inviteInput, setInviteInput] = useState(inviteFromUrl);
  const [visibility, setVisibility] = useState<VisibilityForm>(defaultVisibility);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmUnbind, setConfirmUnbind] = useState(false);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [friendDisplayName, setFriendDisplayName] = useState("噗友");
  const [peerUserId, setPeerUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const canUseFriends = !isLoading && !isGuest && !!user;

  const loadFriendMeta = useCallback(
    async (relationId: string, targetUserId: string) => {
      if (!user) {
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const [profileResult, aliasResult] = await Promise.all([
        getRelationPeerProfile(supabase, relationId),
        getFriendAlias(supabase, {
          relationId,
          ownerUserId: user.id,
          targetUserId,
        }),
      ]);

      const nextName = resolveFriendDisplayName({
        aliasName: aliasResult.data?.alias_name,
        nickname: profileResult.data?.nickname,
        fallback: "噗友",
      });

      setFriendDisplayName(nextName);
      setAliasInput(aliasResult.data?.alias_name ?? "");
      setPeerUserId(targetUserId);
    },
    [user],
  );

  const loadSnapshot = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await getFriendBindingSnapshot(supabase, {
      userId: user.id,
      baseUrl: window.location.origin,
    });

    if (result.error || !result.data) {
      setErrorMessage(result.error?.message ?? "噗友状态加载失败");
      showToast("噗友状态加载失败", "error");
      setLoading(false);
      return;
    }

    setSnapshot(result.data);

    if (result.data.activeRelation) {
      const visibilityResult = await getOrCreateVisibilitySettings(supabase, {
        relationId: result.data.activeRelation.id,
        ownerUserId: user.id,
      });

      if (!visibilityResult.error && visibilityResult.data) {
        setVisibility({
          shareHasRecord: visibilityResult.data.share_has_record,
          shareRecordTime: visibilityResult.data.share_record_time,
          shareShape: visibilityResult.data.share_shape,
          shareNote: visibilityResult.data.share_note,
        });
      }

      const targetId = getPeerUserId(result.data.activeRelation, user.id);
      if (targetId) {
        await loadFriendMeta(result.data.activeRelation.id, targetId);
      }
    } else {
      setFriendDisplayName("噗友");
      setPeerUserId(null);
      setAliasInput("");
    }

    setLoading(false);
  }, [loadFriendMeta, showToast, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (canUseFriends) {
        void loadSnapshot();
      } else {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [canUseFriends, loadSnapshot]);

  useEffect(() => {
    setInviteInput(inviteFromUrl.toUpperCase());
  }, [inviteFromUrl]);

  const stateText = useMemo(() => {
    if (!snapshot) {
      return "未绑定";
    }

    if (snapshot.state === "inviting") {
      return "邀请中";
    }

    if (snapshot.state === "active") {
      return "已绑定";
    }

    return "未绑定";
  }, [snapshot]);

  const handleCreateInvite = async () => {
    if (!user) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await createFriendInvite(supabase, {
      userId: user.id,
      baseUrl: window.location.origin,
    });

    setSubmitting(false);

    if (result.errorMessage || !result.data) {
      setErrorMessage(result.errorMessage ?? "创建邀请失败");
      showToast(result.errorMessage ?? "创建邀请失败", "error");
      return;
    }

    setSnapshot({
      state: "inviting",
      activeRelation: null,
      pendingInvite: result.data,
    });
    setMessage("邀请码已生成。请发送给你的噗友。");
    showToast("邀请码已生成", "success");
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      return;
    }

    const code = inviteInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      setErrorMessage("邀请码格式不正确，请检查后重试。");
      showToast("邀请码格式不正确", "error");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await acceptFriendInvite(supabase, {
      userId: user.id,
      inviteCode: code,
    });

    setSubmitting(false);

    if (result.errorMessage || !result.relation) {
      setErrorMessage(result.errorMessage ?? "接受邀请失败");
      showToast(result.errorMessage ?? "接受邀请失败", "error");
      return;
    }

    setMessage("你们已经成为噗友啦。");
    showToast("绑定成功", "success");
    await loadSnapshot();
  };

  const handleRemoveRelation = async () => {
    if (!user || !snapshot?.activeRelation) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await removeFriendRelation(supabase, {
      userId: user.id,
      relationId: snapshot.activeRelation.id,
    });

    setSubmitting(false);
    setConfirmUnbind(false);

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
      showToast(result.errorMessage, "error");
      return;
    }

    setMessage("已解除噗友关系。");
    showToast("已解除噗友关系", "success");
    await loadSnapshot();
  };

  const handleCopyLink = async () => {
    const inviteLink = snapshot?.pendingInvite?.inviteLink;
    if (!inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage("邀请链接已复制。");
      showToast("邀请链接已复制", "success");
    } catch {
      setErrorMessage("复制失败，请手动复制邀请链接。");
      showToast("复制失败，请手动复制。", "error");
    }
  };

  const handleSaveVisibility = async () => {
    if (!user || !snapshot?.activeRelation) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const result = await updateVisibilitySettings(supabase, {
      relationId: snapshot.activeRelation.id,
      ownerUserId: user.id,
      patch: {
        share_has_record: visibility.shareHasRecord,
        share_record_time: visibility.shareRecordTime,
        share_shape: visibility.shareShape,
        share_note: visibility.shareNote,
      },
    });

    setSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    setMessage("共享范围已更新。");
    showToast("共享范围已更新", "success");
  };

  const handleSaveAlias = async () => {
    if (!user || !snapshot?.activeRelation || !peerUserId) {
      return;
    }

    const trimmed = aliasInput.trim();
    if (trimmed.length > 32) {
      showToast("备注名最多 32 字", "error");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();

    if (!trimmed) {
      const deleted = await deleteFriendAlias(supabase, {
        relationId: snapshot.activeRelation.id,
        ownerUserId: user.id,
        targetUserId: peerUserId,
      });
      setSubmitting(false);

      if (deleted.error) {
        showToast(deleted.error.message, "error");
        return;
      }

      showToast("备注名已更新", "success");
      setAliasOpen(false);
      await loadSnapshot();
      return;
    }

    const upserted = await upsertFriendAlias(supabase, {
      relation_id: snapshot.activeRelation.id,
      owner_user_id: user.id,
      target_user_id: peerUserId,
      alias_name: trimmed,
    });

    setSubmitting(false);

    if (upserted.error) {
      showToast(upserted.error.message, "error");
      return;
    }

    showToast("备注名已更新", "success");
    setAliasOpen(false);
    await loadSnapshot();
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">轻社交陪伴</p>
            <h1 className="text-2xl font-semibold tracking-tight">噗友绑定</h1>
          </div>
          <Button asChild className="toy-btn-secondary h-9" size="sm">
            <Link href="/me">返回</Link>
          </Button>
        </div>

        <Card className="toy-hero py-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[var(--toy-ink)]">当前状态：{stateText}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : null}

            {!isLoading && isGuest ? (
              <>
                <p className="text-sm text-[color:rgba(92,74,65,0.75)]">登录后可发起邀请、接受邀请并管理噗友关系。</p>
                <Button asChild className="toy-btn-primary h-11 w-full">
                  <Link href="/login">去登录</Link>
                </Button>
              </>
            ) : null}

            {canUseFriends && snapshot?.state === "unbound" ? (
              <Button className="toy-btn-primary h-11 w-full" onClick={handleCreateInvite} disabled={submitting}>
                {submitting ? "生成中..." : "发起邀请"}
              </Button>
            ) : null}

            {canUseFriends && snapshot?.state === "inviting" && snapshot.pendingInvite ? (
              <div className="space-y-3">
                <div className="toy-card p-3">
                  <p className="text-xs text-muted-foreground">邀请码</p>
                  <p className="mt-1 text-base font-semibold tracking-widest text-[var(--toy-ink)]">
                    {snapshot.pendingInvite.invite_code}
                  </p>
                </div>
                <div className="toy-card p-3">
                  <p className="text-xs text-muted-foreground">邀请链接</p>
                  <p className="mt-1 break-all text-xs text-[var(--toy-ink)]">{snapshot.pendingInvite.inviteLink}</p>
                </div>
                <Button className="toy-btn-secondary h-11 w-full" onClick={handleCopyLink}>
                  <Link2 className="size-4" />复制邀请链接
                </Button>
              </div>
            ) : null}

            {canUseFriends && snapshot?.state === "active" && snapshot.activeRelation ? (
              <div className="space-y-3">
                <div className="toy-card-sticker p-4">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-base font-semibold text-[var(--toy-ink)]">
                      <Users className="size-4 text-[#7e93d6]" />
                      {friendDisplayName}
                    </p>
                    <Button className="toy-btn-secondary h-9 px-3" onClick={() => setAliasOpen(true)}>
                      <Pencil className="size-4" />修改备注名
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-[color:rgba(92,74,65,0.72)]">
                    关系卡 ID：{snapshot.activeRelation.id.slice(0, 8)}...
                  </p>
                </div>

                <Button className="h-11 w-full rounded-2xl" variant="destructive" onClick={() => setConfirmUnbind(true)}>
                  解除绑定
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {canUseFriends && snapshot?.state !== "active" ? (
          <Card className="toy-card py-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--toy-ink)]">接受邀请</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="toy-note p-3">
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                  className="h-11 w-full rounded-xl border border-[#ebd7c1] bg-white/80 px-3 text-sm tracking-widest text-[var(--toy-ink)] outline-none"
                  placeholder="输入邀请码"
                />
              </div>
              <Button className="toy-btn-primary h-11 w-full" disabled={submitting || !inviteInput.trim()} onClick={handleAcceptInvite}>
                接受邀请
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {canUseFriends && snapshot?.state === "active" ? (
          <Card className="toy-card py-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[var(--toy-ink)]">共享范围设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibility((prev) => ({ ...prev, shareHasRecord: !prev.shareHasRecord }))}
                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${visibility.shareHasRecord ? "border-[#dca679] bg-[#fff1e2]" : "border-[#ecd8c2] bg-white"}`}
              >
                共享“今天是否记录”
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibility((prev) => ({ ...prev, shareRecordTime: !prev.shareRecordTime }))}
                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${visibility.shareRecordTime ? "border-[#dca679] bg-[#fff1e2]" : "border-[#ecd8c2] bg-white"}`}
              >
                共享记录时间
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibility((prev) => ({ ...prev, shareShape: !prev.shareShape }))}
                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${visibility.shareShape ? "border-[#dca679] bg-[#fff1e2]" : "border-[#ecd8c2] bg-white"}`}
              >
                共享形状信息
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisibility((prev) => ({ ...prev, shareNote: !prev.shareNote }))}
                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm ${visibility.shareNote ? "border-[#dca679] bg-[#fff1e2]" : "border-[#ecd8c2] bg-white"}`}
              >
                共享备注内容
              </motion.button>
              <p className="text-xs text-muted-foreground">默认建议仅共享“今天是否记录”。</p>
              <Button className="toy-btn-primary h-11 w-full" disabled={submitting} onClick={handleSaveVisibility}>
                保存共享设置
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="toy-card-sticker py-0">
            <CardContent className="p-4 text-sm text-[var(--toy-ink)]">{message}</CardContent>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card className="rounded-2xl border-destructive/40">
            <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        ) : null}
      </section>

      {aliasOpen ? (
        <div className="fixed inset-0 z-50" data-swipe-lock="true">
          <div className="absolute inset-0 bg-black/35" onClick={() => setAliasOpen(false)} aria-hidden />
          <motion.div
            initial={{ y: 70, opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2rem] border border-[#e6cfb2] bg-[#fffaf2] p-4 pb-6 shadow-xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#e7d7c2]" />
            <h2 className="mb-3 text-lg font-semibold text-[var(--toy-ink)]">修改备注名</h2>
            <div className="toy-note p-3">
              <input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#ebd7c1] bg-white/80 px-3 text-sm text-[var(--toy-ink)] outline-none"
                placeholder="给噗友起个备注"
                maxLength={32}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">清空后保存可恢复显示对方昵称。</p>
            <div className="mt-4 flex gap-2">
              <Button className="toy-btn-secondary h-11 flex-1" onClick={() => setAliasOpen(false)}>
                取消
              </Button>
              <motion.div className="flex-1" whileTap={{ scale: 0.96 }}>
                <Button className="toy-btn-primary h-11 w-full" disabled={submitting} onClick={() => void handleSaveAlias()}>
                  {submitting ? "保存中..." : "保存备注名"}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmUnbind}
        title="确认解除噗友关系吗？"
        description="解绑后就看不到彼此的小信号了。"
        confirmLabel="确认解绑"
        destructive
        loading={submitting}
        onCancel={() => setConfirmUnbind(false)}
        onConfirm={() => void handleRemoveRelation()}
      />
    </div>
  );
}
