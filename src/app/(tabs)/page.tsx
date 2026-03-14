"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Cloud,
  Heart,
  HeartHandshake,
  PartyPopper,
  Play,
  Sparkles,
  ThumbsUp,
  Timer,
  Waves,
  Wine,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { FadeIn } from "@/components/common/fade-in";
import { useToast } from "@/components/feedback/toast-provider";
import { HomeSignalOverlay } from "@/components/friends/home-signal-overlay";
import { RecordDrawer } from "@/components/records/record-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureClientUser } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clearDailyStatusByDate,
  getDailyStatusByDate,
  upsertDailyStatus,
} from "@/services/daily-status.service";
import { getFriendVisibleTodaySummary } from "@/services/friend-visibility.service";
import { getFriendAlias, resolveFriendDisplayName } from "@/services/friend-alias.service";
import { getActiveFriendRelation, type FriendRelation } from "@/services/friend.service";
import {
  countUnreadInteractions,
  listRelationInteractions,
  markInteractionsAsRead,
  sendFriendInteraction,
  type InteractionFeedItem,
} from "@/services/interaction.service";
import { getRelationPeerProfile } from "@/services/profile.service";
import { getHomeSummary, type RecordItem } from "@/services/record.service";
import type { DailyStatusType, InteractionType, ShapeType } from "@/types/database";

const shapeLabelMap: Record<ShapeType, string> = {
  dry: "偏干",
  normal: "正常",
  loose: "偏稀",
};

const interactionActionOptions: Array<{
  value: InteractionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "cheer", label: "顺顺顺", icon: Waves },
  { value: "clap", label: "鼓掌", icon: ThumbsUp },
  { value: "heart", label: "爱心", icon: Heart },
  { value: "drink_water", label: "喝水提醒", icon: Wine },
];

const dailyStatusOptions: Array<{ value: DailyStatusType; label: string }> = [
  { value: "no_poop", label: "今日没拉" },
  { value: "skip", label: "今天跳过" },
  { value: "quiet", label: "今天没动静" },
];

type SessionDraft = {
  sessionStartedAt: string;
  sessionEndedAt: string;
  durationSeconds: number;
  recordDate: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date = new Date()) {
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

function formatDuration(durationSeconds: number) {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes} 分 ${seconds} 秒`;
}

type HomeState = {
  hasRecordToday: boolean;
  weekCount: number;
  monthCount: number;
  latestRecord: RecordItem | null;
  insightText: string;
};

type FriendCardState = {
  relation: FriendRelation | null;
  hasRecordToday: boolean;
  recordTime: string | null;
  shapeType: ShapeType | null;
  unreadCount: number;
  interactions: InteractionFeedItem[];
};

export default function HomePage() {
  const { nickname, user: authUser } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [friendActionOpen, setFriendActionOpen] = useState(false);
  const [sendingAction, setSendingAction] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft | null>(null);
  const [dailyStatusToday, setDailyStatusToday] = useState<DailyStatusType | null>(null);
  const [savingDailyStatus, setSavingDailyStatus] = useState(false);
  const [dailyStatusSheetOpen, setDailyStatusSheetOpen] = useState(false);
  const { showToast } = useToast();

  const [summary, setSummary] = useState<HomeState>({
    hasRecordToday: false,
    weekCount: 0,
    monthCount: 0,
    latestRecord: null,
    insightText: "最近有在认真记录哦",
  });
  const [friendState, setFriendState] = useState<FriendCardState>({
    relation: null,
    hasRecordToday: false,
    recordTime: null,
    shapeType: null,
    unreadCount: 0,
    interactions: [],
  });
  const [friendDisplayName, setFriendDisplayName] = useState("噗友");

  const todayKey = useMemo(() => formatDateKeyLocal(new Date()), []);
  const dayLabel = useMemo(() => formatDayLabel(), []);
  const sessionRunning = Boolean(sessionStartedAt);
  const viewerName = useMemo(() => {
    const nick = nickname?.trim();
    if (nick) {
      return nick;
    }

    const prefix = authUser?.email?.split("@")[0]?.trim();
    if (prefix) {
      return prefix;
    }

    return "顺顺用户";
  }, [authUser?.email, nickname]);

  useEffect(() => {
    if (!sessionStartedAt) {
      return;
    }

    const tick = () => {
      const diffSec = Math.max(
        0,
        Math.floor((Date.now() - new Date(sessionStartedAt).getTime()) / 1000),
      );
      setElapsedSeconds(diffSec);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [sessionStartedAt]);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const auth = await ensureClientUser();
    if (auth.errorMessage || !auth.user) {
      setLoading(false);
      const message = auth.errorMessage ?? "登录状态异常，请刷新重试。";
      setErrorMessage(message);
      showToast(message, "error");
      return;
    }

    setUserId(auth.user.id);
    const supabase = getSupabaseBrowserClient();

    const [summaryResult, relationResult, dailyResult] = await Promise.all([
      getHomeSummary(supabase, auth.user.id),
      getActiveFriendRelation(supabase, auth.user.id),
      getDailyStatusByDate(supabase, { userId: auth.user.id, date: todayKey }),
    ]);

    if (summaryResult.error || relationResult.error || dailyResult.error) {
      setLoading(false);
      const message =
        summaryResult.error?.message ??
        relationResult.error?.message ??
        dailyResult.error?.message ??
        "加载失败";
      setErrorMessage(message);
      showToast("首页数据加载失败", "error");
      return;
    }

    if (summaryResult.data) {
      setSummary(summaryResult.data);
    }
    setDailyStatusToday(dailyResult.data?.status ?? null);

    if (!relationResult.data) {
      setFriendState({
        relation: null,
        hasRecordToday: false,
        recordTime: null,
        shapeType: null,
        unreadCount: 0,
        interactions: [],
      });
      setFriendDisplayName("噗友");
      setLoading(false);
      return;
    }

    const relation = relationResult.data;

    const [visibleResult, interactionsResult, unreadResult] = await Promise.all([
      getFriendVisibleTodaySummary(supabase, {
        relation,
        viewerUserId: auth.user.id,
        date: todayKey,
      }),
      listRelationInteractions(supabase, { relationId: relation.id, limit: 12 }),
      countUnreadInteractions(supabase, {
        relationId: relation.id,
        receiverUserId: auth.user.id,
      }),
    ]);

    if (visibleResult.errorMessage || interactionsResult.error || unreadResult.error) {
      setLoading(false);
      const message =
        visibleResult.errorMessage ??
        interactionsResult.error?.message ??
        unreadResult.error?.message ??
        "噗友状态加载失败";
      setErrorMessage(message);
      showToast("噗友状态加载失败", "error");
      return;
    }

    if (!visibleResult.data) {
      setLoading(false);
      setErrorMessage("噗友状态加载失败");
      showToast("噗友状态加载失败", "error");
      return;
    }

    setFriendState({
      relation,
      hasRecordToday: visibleResult.data.hasRecord,
      recordTime: visibleResult.data.recordTime,
      shapeType: visibleResult.data.shapeType,
      unreadCount: unreadResult.count,
      interactions: interactionsResult.data,
    });

    const targetUserId =
      relation.user_id === auth.user.id ? relation.friend_user_id : relation.user_id;
    const [friendProfileResult, aliasResult] = await Promise.all([
      getRelationPeerProfile(supabase, relation.id),
      getFriendAlias(supabase, {
        relationId: relation.id,
        ownerUserId: auth.user.id,
        targetUserId,
      }),
    ]);

    setFriendDisplayName(
      resolveFriendDisplayName({
        aliasName: aliasResult.data?.alias_name,
        nickname: friendProfileResult.data?.nickname,
        fallback: "噗友",
      }),
    );

    setLoading(false);
  }, [showToast, todayKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void reload();
    }, 0);

    return () => clearTimeout(timer);
  }, [reload]);

  const handleStartSession = () => {
    if (!userId) {
      return;
    }

    const now = new Date().toISOString();
    setSessionStartedAt(now);
    setElapsedSeconds(0);
    setSuccessMessage(null);
  };

  const handleFinishSession = () => {
    if (!sessionStartedAt || !userId) {
      return;
    }

    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      Math.floor((new Date(endedAt).getTime() - new Date(sessionStartedAt).getTime()) / 1000),
    );

    setSessionDraft({
      sessionStartedAt,
      sessionEndedAt: endedAt,
      durationSeconds,
      recordDate: formatDateKeyLocal(new Date(endedAt)),
    });
    setSessionStartedAt(null);
    setElapsedSeconds(durationSeconds);
    setDrawerOpen(true);
  };

  const handleSaved = async (record: RecordItem) => {
    void record;
    setSuccessMessage("记录好了，今天也顺顺的");
    showToast("记录好了，今天也顺顺的", "success");
    setSessionDraft(null);
    if (userId) {
      const supabase = getSupabaseBrowserClient();
      await clearDailyStatusByDate(supabase, { userId, date: todayKey });
      setDailyStatusToday(null);
    }
    await reload();
    setTimeout(() => setSuccessMessage(null), 1800);
  };

  const handleOpenManualRecord = () => {
    setSessionDraft(null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSessionDraft(null);
  };

  const handleSaveDailyStatus = async (status: DailyStatusType) => {
    if (!userId) {
      return;
    }
    if (summary.hasRecordToday) {
      showToast("今天已经记录过啦", "error");
      return;
    }

    setSavingDailyStatus(true);
    const supabase = getSupabaseBrowserClient();
    const result = await upsertDailyStatus(supabase, { userId, date: todayKey, status });
    setSavingDailyStatus(false);

    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }

    setDailyStatusToday(status);
    const label = dailyStatusOptions.find((item) => item.value === status)?.label ?? "今日状态已更新";
    showToast(label, "success");
    setDailyStatusSheetOpen(false);
  };

  const handleClearDailyStatus = async () => {
    if (!userId) {
      return;
    }

    setSavingDailyStatus(true);
    const supabase = getSupabaseBrowserClient();
    const result = await clearDailyStatusByDate(supabase, { userId, date: todayKey });
    setSavingDailyStatus(false);

    if (result.error) {
      showToast(result.error.message, "error");
      return;
    }

    setDailyStatusToday(null);
    showToast("已清除今日轻状态", "success");
  };

  const handleSendInteraction = async (type: InteractionType) => {
    if (!userId || !friendState.relation) {
      return;
    }

    setSendingAction(true);
    const supabase = getSupabaseBrowserClient();
    const result = await sendFriendInteraction(supabase, {
      relation: friendState.relation,
      senderUserId: userId,
      interactionType: type,
      targetRecordId: null,
    });

    setSendingAction(false);
    setFriendActionOpen(false);

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    setSuccessMessage("回应已发送给噗友");
    showToast("你的回应已发送给噗友", "success");
    await reload();
    setTimeout(() => setSuccessMessage(null), 1800);
  };

  const handleMarkRead = async () => {
    if (!userId || !friendState.relation) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const result = await markInteractionsAsRead(supabase, {
      relationId: friendState.relation.id,
      receiverUserId: userId,
    });

    if (result.error) {
      setErrorMessage(result.error.message);
      showToast(result.error.message, "error");
      return;
    }

    showToast("未读互动已标记为已读", "success");
    await reload();
  };

  return (
    <section className="space-y-4 pb-2">
      <FadeIn>
        <Card className="toy-hero py-0">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="toy-chip text-[var(--toy-ink)]">{dayLabel}</span>
              <span className="toy-chip flex items-center gap-1 text-[var(--toy-ink)]">
                <Sparkles className="size-3.5" />今日顺顺
              </span>
            </div>
            <p className="text-sm text-[color:rgba(92,74,65,0.85)]">{summary.insightText}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#ecd8c2] bg-[var(--toy-yellow)]/45 px-3 py-2">
                <p className="text-xs text-[color:rgba(92,74,65,0.72)]">本周</p>
                <p className="text-lg font-semibold text-[var(--toy-ink)]">{summary.weekCount} 次</p>
              </div>
              <div className="rounded-xl border border-[#ecd8c2] bg-[var(--toy-mint)] px-3 py-2">
                <p className="text-xs text-[color:rgba(92,74,65,0.72)]">最近一次</p>
                <p className="text-sm font-semibold text-[var(--toy-ink)]">
                  {summary.latestRecord ? formatDateTime(summary.latestRecord.record_time) : "暂无"}
                </p>
              </div>
            </div>
            <p className="text-xs text-[color:rgba(92,74,65,0.72)]">{viewerName}，轻点一下，留个软软的小信号。</p>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative">
          <HomeSignalOverlay
            interactions={friendState.interactions}
            viewerUserId={userId}
            friendName={friendDisplayName}
          />
          <Card className="toy-card-sticker relative overflow-hidden py-0">
            <CardContent className="space-y-4 px-5 py-4">
              <div className="absolute -right-4 top-2">
                <Cloud className="size-8 text-[#b7c8ff]" />
              </div>

            <div className="flex items-center gap-4">
              <motion.div
                animate={{ y: [0, -5, 0], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                className="relative h-20 w-20 shrink-0 rounded-[2rem] border border-white/70 bg-white/80"
              >
                <div className="absolute left-3 top-3 h-5 w-5 rounded-full bg-[var(--toy-pink)]" />
                <div className="absolute right-3 top-4 h-4 w-4 rounded-full bg-[var(--toy-yellow)]" />
                <div className="absolute bottom-4 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-[color:rgba(92,74,65,0.7)]" />
              </motion.div>
              <div>
                <p className="text-sm font-medium text-[var(--toy-ink)]">今日团子陪伴中</p>
                <p className="mt-1 text-xs text-[color:rgba(92,74,65,0.75)]">开始一段小计时，结束后补充感受。</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={sessionRunning ? handleFinishSession : handleStartSession}
              disabled={!userId}
              className="toy-btn-primary flex h-16 w-full items-center justify-between px-4 text-left disabled:opacity-60"
            >
              <div>
                <p className="text-xs text-white/80">{sessionRunning ? "正在进行中" : "准备开始"}</p>
                <p className="text-2xl font-semibold leading-none">{sessionRunning ? "拉完了" : "开始拉"}</p>
              </div>
              <span className="toy-icon-bubble p-2 text-[#de7f47]">
                {sessionRunning ? <CheckCircle2 className="size-6" /> : <Play className="size-6" />}
              </span>
            </motion.button>

            <motion.div
              layout
              className={`rounded-[1.2rem] border px-4 py-3 ${
                sessionRunning
                  ? "border-[#f0b98d] bg-[#fff2e4]"
                  : "border-[#ead6bf] bg-[#fffaf2]"
              }`}
            >
              <div className="flex items-center justify-between text-[var(--toy-ink)]">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Timer className="size-4" />正在进行中
                </p>
                <p className="text-lg font-semibold">{formatDuration(elapsedSeconds)}</p>
              </div>
              <p className="mt-1 text-xs text-[color:rgba(92,74,65,0.75)]">
                {sessionRunning ? "完成后点“拉完了”，再补充这次感觉。" : "还没开始，点“开始拉”进入计时。"}
              </p>
            </motion.div>

            <Button className="toy-btn-secondary h-11 w-full" onClick={handleOpenManualRecord} disabled={!userId}>
              记录一次
            </Button>

            {!summary.hasRecordToday ? (
              <div className="rounded-xl border border-[#ecd8c2] bg-[#fffaf2] px-3 py-2">
                {dailyStatusToday ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="toy-chip">
                      {dailyStatusOptions.find((item) => item.value === dailyStatusToday)?.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        className="toy-btn-secondary h-8 px-2 text-xs"
                        onClick={() => setDailyStatusSheetOpen(true)}
                        disabled={savingDailyStatus || sessionRunning}
                      >
                        修改
                      </Button>
                      <Button
                        className="toy-btn-secondary h-8 px-2 text-xs"
                        onClick={() => void handleClearDailyStatus()}
                        disabled={savingDailyStatus || sessionRunning}
                      >
                        清除
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="toy-btn-secondary h-8 px-3 text-xs"
                    onClick={() => setDailyStatusSheetOpen(true)}
                    disabled={savingDailyStatus || sessionRunning}
                  >
                    轻标记今天
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[#ecd8c2] bg-[#fffaf2] px-3 py-2">
                <span className="text-xs text-[color:rgba(92,74,65,0.75)]">今天已经记录过啦</span>
              </div>
            )}
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card className="toy-card py-0">
          <CardHeader className="px-5 pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-base text-[var(--toy-ink)]">
              <HeartHandshake className="size-4 text-[#df8fa5]" />
              噗友信号卡
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {!friendState.relation ? (
              <div className="rounded-[1.2rem] border border-[#ecd8c2] bg-[#fff8ef] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-[var(--toy-ink)]">
                  <Cloud className="size-4 text-[#95a8df]" />
                  <span>还没绑定噗友</span>
                </div>
                <Button asChild className="toy-btn-secondary h-11 w-full text-sm">
                  <Link href="/friends">去绑定噗友</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-[1.2rem] border border-[#ecd8c2] bg-[#fff7ef] p-4">
                <p className="text-sm font-medium text-[var(--toy-ink)]">
                  {friendState.hasRecordToday
                    ? `${friendDisplayName} 今日有信号`
                    : `${friendDisplayName} 今日静悄悄`}
                </p>
                <div className="flex items-center justify-between text-xs text-[color:rgba(92,74,65,0.74)]">
                  <span>{friendState.recordTime ? formatDateTime(friendState.recordTime) : "时间未共享"}</span>
                  <span>{friendState.shapeType ? shapeLabelMap[friendState.shapeType] : "形状未共享"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full border-0 bg-white text-[var(--toy-ink)]">
                    {friendState.unreadCount > 0 ? `有新信号 ${friendState.unreadCount}` : "暂无新信号"}
                  </Badge>
                  <Button className="toy-btn-secondary h-9" onClick={handleMarkRead} disabled={friendState.unreadCount === 0}>
                    标记已读
                  </Button>
                  <Button className="toy-btn-primary h-9" onClick={() => setFriendActionOpen(true)} disabled={!friendState.hasRecordToday}>
                    发个回应
                  </Button>
                </div>
                <Button asChild className="toy-btn-secondary h-10 w-full text-sm">
                  <Link href="/friends">查看噗友关系</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {successMessage ? (
        <FadeIn>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
            <Card className="toy-card-sticker py-0">
              <CardContent className="flex items-center gap-2 px-5 py-4 text-sm text-[var(--toy-ink)]">
                <PartyPopper className="size-4 text-[#5fa373]" />
                <span>{successMessage}</span>
              </CardContent>
            </Card>
          </motion.div>
        </FadeIn>
      ) : null}

      {errorMessage ? (
        <Card className="rounded-3xl border-destructive/40 py-0">
          <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card className="toy-card py-0">
          <CardContent className="space-y-3 px-5 py-5">
            <Skeleton className="h-5 w-44 rounded-xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </CardContent>
        </Card>
      ) : null}

      {userId ? (
        <RecordDrawer
          open={drawerOpen}
          mode="create"
          userId={userId}
          sessionDraft={sessionDraft}
          onClose={handleCloseDrawer}
          onSaved={handleSaved}
        />
      ) : null}

      {friendActionOpen ? (
        <div className="fixed inset-0 z-50" data-swipe-lock="true">
          <div className="absolute inset-0 bg-black/35" onClick={() => setFriendActionOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2rem] border border-[#e6cfb2] bg-[#fffaf2] p-4 pb-6 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#e7d7c2]" />
            <h2 className="mb-4 text-lg font-semibold text-[var(--toy-ink)]">发个回应</h2>
            <div className="grid grid-cols-2 gap-2">
              {interactionActionOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.value}
                    className="toy-btn-secondary h-14"
                    disabled={sendingAction}
                    onClick={() => void handleSendInteraction(item.value)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
            <Button className="toy-btn-primary mt-3 h-10 w-full" onClick={() => setFriendActionOpen(false)}>
              取消
            </Button>
          </div>
        </div>
      ) : null}

      {dailyStatusSheetOpen ? (
        <div className="fixed inset-0 z-50" data-swipe-lock="true">
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setDailyStatusSheetOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2rem] border border-[#e6cfb2] bg-[#fffaf2] p-4 pb-6 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#e7d7c2]" />
            <h2 className="mb-4 text-lg font-semibold text-[var(--toy-ink)]">轻标记今天</h2>
            <div className="space-y-2">
              {dailyStatusOptions.map((item) => {
                const active = dailyStatusToday === item.value;
                return (
                  <motion.button
                    key={item.value}
                    whileTap={{ scale: 0.98 }}
                    className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm ${
                      active
                        ? "border-[#d98758] bg-[#fff1e2] text-[#b66637]"
                        : "border-[#ecd8c2] bg-white text-[var(--toy-ink)]"
                    }`}
                    disabled={savingDailyStatus || sessionRunning || summary.hasRecordToday}
                    onClick={() => void handleSaveDailyStatus(item.value)}
                  >
                    <span>{item.label}</span>
                    {active ? <span>✓</span> : null}
                  </motion.button>
                );
              })}
            </div>
            <Button
              className="toy-btn-secondary mt-3 h-10 w-full"
              onClick={() => setDailyStatusSheetOpen(false)}
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
