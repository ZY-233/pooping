"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  CloudRain,
  Frown,
  Meh,
  Sparkles,
  SunMedium,
  Zap,
} from "lucide-react";

import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createPoopRecord,
  updatePoopRecord,
  type RecordItem,
} from "@/services/record.service";
import type { FeelingType, ShapeType } from "@/types/database";

type RecordDrawerMode = "create" | "edit";

type RecordDrawerProps = {
  open: boolean;
  mode: RecordDrawerMode;
  userId: string;
  record?: RecordItem | null;
  sessionDraft?: {
    sessionStartedAt: string;
    sessionEndedAt: string;
    durationSeconds: number;
    recordDate: string;
  } | null;
  onClose: () => void;
  onSaved: (record: RecordItem) => void;
};

const shapeOptions: Array<{
  label: string;
  value: ShapeType;
  icon: typeof SunMedium;
  tone: string;
}> = [
  { label: "偏干", value: "dry", icon: SunMedium, tone: "bg-[var(--toy-yellow)] text-[#9a6a40]" },
  { label: "正常", value: "normal", icon: Circle, tone: "bg-[var(--toy-mint)] text-[#4e8a67]" },
  { label: "偏稀", value: "loose", icon: CloudRain, tone: "bg-[var(--toy-sky)] text-[#5875b3]" },
];

const feelingOptions: Array<{
  label: string;
  value: FeelingType;
  icon: typeof Sparkles;
}> = [
  { label: "很顺", value: "smooth", icon: Sparkles },
  { label: "一般", value: "normal", icon: Meh },
  { label: "有点费劲", value: "hard", icon: Frown },
  { label: "很急", value: "urgent", icon: Zap },
];

function toInputDateTime(iso: string) {
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function nowInputDateTime() {
  return toInputDateTime(new Date().toISOString());
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function RecordDrawer({
  open,
  mode,
  userId,
  record,
  sessionDraft,
  onClose,
  onSaved,
}: RecordDrawerProps) {
  const [recordTime, setRecordTime] = useState(nowInputDateTime);
  const [shapeType, setShapeType] = useState<ShapeType | "">("");
  const [feelingType, setFeelingType] = useState<FeelingType | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessLayer, setShowSuccessLayer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      if (record) {
        setRecordTime(toInputDateTime(record.record_time));
        setShapeType(record.shape_type ?? "");
        setFeelingType(record.feeling_type ?? "");
        setNote(record.note ?? "");
      } else if (sessionDraft) {
        setRecordTime(toInputDateTime(sessionDraft.sessionEndedAt));
        setShapeType("");
        setFeelingType("");
        setNote("");
      } else {
        setRecordTime(nowInputDateTime());
        setShapeType("");
        setFeelingType("");
        setNote("");
      }

      setShowSuccessLayer(false);
      setErrorMessage(null);
    }, 0);

    return () => clearTimeout(timer);
  }, [open, record, sessionDraft]);

  const title = useMemo(
    () => (mode === "create" ? "这次感觉怎么样？" : "编辑记录"),
    [mode],
  );

  if (!open) {
    return null;
  }

  const onSubmitSuccess = async (savedRecord: RecordItem) => {
    setShowSuccessLayer(true);

    const message = mode === "create" ? "记录已保存" : "记录已更新";
    showToast(message, "success");

    setTimeout(() => {
      onSaved(savedRecord);
      setShowSuccessLayer(false);
      onClose();
    }, 900);
  };

  const handleSubmit = async () => {
    if (!recordTime) {
      setErrorMessage("请选择记录时间");
      return;
    }

    const parsed = new Date(recordTime).getTime();
    if (Number.isNaN(parsed)) {
      setErrorMessage("时间格式不正确");
      return;
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > 300) {
      setErrorMessage("备注最多 300 字");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const supabase = getSupabaseBrowserClient();
    const payload = {
      user_id: userId,
      record_time: new Date(recordTime).toISOString(),
      record_date: sessionDraft?.recordDate ?? recordTime.slice(0, 10),
      shape_type: shapeType || null,
      feeling_type: feelingType || null,
      note: trimmedNote ? trimmedNote : null,
      session_started_at: sessionDraft?.sessionStartedAt ?? null,
      session_ended_at: sessionDraft?.sessionEndedAt ?? null,
      duration_seconds: sessionDraft?.durationSeconds ?? null,
    };

    if (mode === "create") {
      const created = await createPoopRecord(supabase, payload);
      setSubmitting(false);

      if (created.error || !created.data) {
        setErrorMessage(created.error?.message ?? "保存失败，请稍后重试。");
        showToast("保存失败，请再试一次。", "error");
        return;
      }

      await onSubmitSuccess(created.data);
      return;
    }

    if (!record?.id) {
      setSubmitting(false);
      setErrorMessage("记录不存在，无法编辑。");
      showToast("记录不存在，无法编辑。", "error");
      return;
    }

    const updated = await updatePoopRecord(supabase, {
      id: record.id,
      userId,
      patch: {
        record_time: payload.record_time,
        record_date: payload.record_date,
        shape_type: payload.shape_type,
        feeling_type: payload.feeling_type,
        note: payload.note,
      },
    });

    setSubmitting(false);

    if (updated.error || !updated.data) {
      setErrorMessage(updated.error?.message ?? "更新失败，请稍后重试。");
      showToast("更新失败，请再试一次。", "error");
      return;
    }

    await onSubmitSuccess(updated.data);
  };

  return (
    <div className="fixed inset-0 z-50" data-swipe-lock="true">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={submitting || showSuccessLayer ? undefined : onClose}
        aria-hidden
      />
      <motion.div
        initial={{ y: 86, opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[2.1rem] border border-[#e7d2b7] bg-[#fff9f1] p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e6d6c1]" />

        <div className="space-y-3">
          <div className="toy-hero p-4">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ y: [0, -4, 0], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                className="toy-icon-bubble relative h-14 w-14 shrink-0"
              >
                <div className="absolute left-2 top-2 h-4 w-4 rounded-full bg-[var(--toy-pink)]" />
                <div className="absolute right-2 top-2 h-4 w-4 rounded-full bg-[var(--toy-yellow)]" />
                <div className="absolute bottom-3 left-1/2 h-2 w-6 -translate-x-1/2 rounded-full bg-[color:rgba(92,74,65,0.65)]" />
              </motion.div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--toy-ink)]">{title}</h2>
                <p className="text-xs text-[color:rgba(92,74,65,0.75)]">今天状态，用一张卡记下来。</p>
                {sessionDraft ? (
                  <p className="mt-1 text-xs text-[color:rgba(92,74,65,0.75)]">
                    {formatClock(sessionDraft.sessionStartedAt)} -{" "}
                    {formatClock(sessionDraft.sessionEndedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="toy-card p-3">
            <p className="mb-2 text-xs text-[color:rgba(92,74,65,0.75)]">时间</p>
            <div className="flex items-center gap-2 rounded-xl border border-[#ecd8c2] bg-[#fffdf7] px-3 py-2">
              <CalendarClock className="size-4 text-[#d58a54]" />
              <input
                type="datetime-local"
                className="w-full bg-transparent text-sm text-[var(--toy-ink)] outline-none"
                value={recordTime}
                onChange={(e) => setRecordTime(e.target.value)}
              />
            </div>
            {sessionDraft ? (
              <p className="mt-2 text-xs text-[color:rgba(92,74,65,0.75)]">
                这次用了 {Math.floor(sessionDraft.durationSeconds / 60)} 分{" "}
                {sessionDraft.durationSeconds % 60} 秒
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[color:rgba(92,74,65,0.75)]">形状（可选）</p>
            <div className="grid grid-cols-3 gap-2">
              {shapeOptions.map((item) => {
                const Icon = item.icon;
                const selected = shapeType === item.value;
                return (
                  <motion.button
                    key={item.value}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShapeType((prev) => (prev === item.value ? "" : item.value))}
                    className={cn(
                      "toy-card flex h-24 flex-col items-center justify-center gap-2 p-2 text-sm",
                      selected ? "ring-2 ring-[#e39c67] bg-[#fff3e7]" : "",
                    )}
                  >
                    <span className={cn("rounded-xl p-2", item.tone)}>
                      <Icon className="size-5" />
                    </span>
                    <span className="font-medium text-[var(--toy-ink)]">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[color:rgba(92,74,65,0.75)]">感受（可选）</p>
            <div className="grid grid-cols-2 gap-2">
              {feelingOptions.map((item) => {
                const Icon = item.icon;
                const selected = feelingType === item.value;
                return (
                  <motion.button
                    key={item.value}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setFeelingType((prev) => (prev === item.value ? "" : item.value))
                    }
                    className={cn(
                      "flex h-12 items-center justify-center gap-2 rounded-full border border-[#ecd8c2] bg-[#fffdf7] px-3 text-sm font-medium text-[var(--toy-ink)]",
                      selected ? "bg-[var(--toy-pink)]/60 ring-2 ring-[#e6aac0]" : "",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="toy-note p-3">
            <p className="mb-1 text-xs text-[color:rgba(92,74,65,0.75)]">备注（可选）</p>
            <textarea
              className="min-h-20 w-full resize-none rounded-xl border border-[#ebd7c1] bg-white/70 px-3 py-2 text-sm text-[var(--toy-ink)] outline-none placeholder:text-[color:rgba(92,74,65,0.45)] focus:ring-2 focus:ring-[#f0d1ae]"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="写下一点点今天的状态..."
            />
          </div>
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-destructive">{errorMessage}</p> : null}

        <div className="mt-4 flex gap-2">
          <Button
            className="toy-btn-secondary h-12 flex-1"
            onClick={onClose}
            disabled={submitting || showSuccessLayer}
          >
            取消
          </Button>
          <motion.div className="flex-1" whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 380 }}>
            <Button
              className="toy-btn-primary h-12 w-full text-base"
              onClick={handleSubmit}
              disabled={submitting || showSuccessLayer}
            >
              {submitting ? "保存中..." : "保存记录"}
            </Button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showSuccessLayer ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-20 flex items-center justify-center rounded-t-[2.1rem] bg-[#fffaf4]/95 p-6"
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="toy-hero w-full p-6 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.65, repeat: Number.POSITIVE_INFINITY }}
                  className="toy-icon-bubble mx-auto mb-3 flex h-14 w-14 items-center justify-center"
                >
                  <CheckCircle2 className="size-7 text-[#5fa373]" />
                </motion.div>
                <p className="text-lg font-semibold text-[var(--toy-ink)]">记录成功</p>
                <p className="mt-1 text-sm text-[color:rgba(92,74,65,0.74)]">今天也被你温柔照顾到了。</p>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
