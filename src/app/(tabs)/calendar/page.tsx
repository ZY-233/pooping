"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarDecorations } from "@/components/calendar/calendar-decorations";
import { MonthlySummaryCard } from "@/components/calendar/monthly-summary-card";
import { CalendarPoopMarker } from "@/components/calendar/calendar-poop-marker";
import { FadeIn } from "@/components/common/fade-in";
import { useToast } from "@/components/feedback/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureClientUser } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { listDailyStatusesByMonth } from "@/services/daily-status.service";
import {
  getMonthCalendar,
  getRecordsByDate,
  type MonthCalendar,
  type RecordItem,
} from "@/services/record.service";
import type { DailyStatusType } from "@/types/database";

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

function formatDateKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date: Date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameMonth(dateKey: string, monthDate: Date) {
  const monthPrefix = `${monthDate.getFullYear()}-${`${monthDate.getMonth() + 1}`.padStart(2, "0")}`;
  return dateKey.startsWith(monthPrefix);
}

type CalendarCell = {
  dateKey: string;
  day: number;
};

export default function CalendarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string>(formatDateKeyLocal(new Date()));
  const [calendarData, setCalendarData] = useState<MonthCalendar | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<RecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [dailyStatusMap, setDailyStatusMap] = useState<Map<string, DailyStatusType>>(
    new Map(),
  );
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const dayCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (calendarData?.days ?? []).forEach((item) => map.set(item.date, item.count));
    return map;
  }, [calendarData]);

  const gridCells = useMemo<CalendarCell[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekDay = new Date(year, month, 1).getDay();
    const leading = (weekDay + 6) % 7;

    const cells: CalendarCell[] = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push({ dateKey: `empty-${i}`, day: 0 });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = formatDateKeyLocal(new Date(year, month, day));
      cells.push({ dateKey: key, day });
    }

    const trailing = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailing; i += 1) {
      cells.push({ dateKey: `tail-${i}`, day: 0 });
    }

    return cells;
  }, [currentMonth]);

  const loadMonth = useCallback(
    async (uid: string, monthDate: Date) => {
      setLoadingMonth(true);
      setErrorMessage(null);

      const supabase = getSupabaseBrowserClient();
      const monthResult = await getMonthCalendar(supabase, {
        userId: uid,
        year: monthDate.getFullYear(),
        month: monthDate.getMonth() + 1,
      });

      const first = formatDateKeyLocal(
        new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      );
      const last = formatDateKeyLocal(
        new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0),
      );
      const dailyResult = await listDailyStatusesByMonth(supabase, {
        userId: uid,
        fromDate: first,
        toDate: last,
      });

      if (monthResult.error || !monthResult.data || dailyResult.error) {
        setLoadingMonth(false);
        setCalendarData(null);
        setErrorMessage(
          monthResult.error?.message ?? dailyResult.error?.message ?? "月历加载失败",
        );
        showToast("月历加载失败", "error");
        return;
      }

      setCalendarData(monthResult.data);
      setDailyStatusMap(
        new Map(dailyResult.data.map((item) => [item.status_date, item.status])),
      );
      setLoadingMonth(false);

      if (!isSameMonth(selectedDate, monthDate)) {
        setSelectedDate(
          formatDateKeyLocal(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)),
        );
      }
    },
    [selectedDate, showToast],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        const auth = await ensureClientUser();

        if (auth.errorMessage || !auth.user) {
          setErrorMessage(auth.errorMessage ?? "登录状态异常，请刷新重试。");
          showToast(auth.errorMessage ?? "登录状态异常，请刷新重试。", "error");
          setLoadingMonth(false);
          return;
        }

        setUserId(auth.user.id);
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const timer = setTimeout(() => {
      void loadMonth(userId, currentMonth);
    }, 0);

    return () => clearTimeout(timer);
  }, [currentMonth, loadMonth, userId]);

  useEffect(() => {
    if (!userId || !selectedDate.startsWith("20")) {
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        setLoadingRecords(true);
        const supabase = getSupabaseBrowserClient();
        const result = await getRecordsByDate(supabase, { userId, date: selectedDate });
        setLoadingRecords(false);

        if (result.error) {
          showToast("当日记录加载失败", "error");
          return;
        }

        setSelectedRecords(result.data);
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedDate, showToast, userId]);

  return (
    <section className="space-y-4">
      <FadeIn>
        <MonthlySummaryCard monthCount={calendarData?.monthCount ?? 0} />
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="toy-card relative overflow-hidden py-0">
          <CalendarDecorations variant="calendar" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button
                className="toy-btn-secondary"
                size="icon-sm"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                aria-label="上一月"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <CardTitle className="text-base font-medium text-[var(--toy-ink)]">{monthTitle(currentMonth)}</CardTitle>

              <Button
                className="toy-btn-secondary"
                size="icon-sm"
                onClick={() =>
                  setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                aria-label="下一月"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {weekDays.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {gridCells.map((cell, index) => {
                if (cell.day === 0) {
                  return <div key={cell.dateKey} className="aspect-square" />;
                }

                const count = dayCountMap.get(cell.dateKey) ?? 0;
                const selected = cell.dateKey === selectedDate;
                const dayStatus = dailyStatusMap.get(cell.dateKey);
                const hasLightStatus = count === 0 && Boolean(dayStatus);
                const statusText =
                  dayStatus === "no_poop"
                    ? "没拉"
                    : dayStatus === "skip"
                      ? "跳过"
                      : dayStatus === "quiet"
                        ? "没动静"
                        : "";

                return (
                  <motion.button
                    key={cell.dateKey}
                    type="button"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      ease: "easeOut",
                      delay: Math.min(index * 0.006, 0.15),
                    }}
                    onClick={() => setSelectedDate(cell.dateKey)}
                    className={`relative aspect-square rounded-xl border text-sm transition ${
                      selected
                        ? "border-[#d98758] bg-[#fff1e2] text-[#c77242]"
                        : count > 0
                          ? "border-[#ccd7f7] bg-[#f2f6ff] text-[var(--toy-ink)]"
                          : hasLightStatus
                            ? "border-[#e6dccf] bg-[#faf7f3] text-[var(--toy-ink)]"
                          : "border-[#ecd8c2] bg-[#fffdf7] text-[var(--toy-ink)]"
                    }`}
                    aria-label={`${cell.dateKey}，${
                      count > 0 ? "有记录" : hasLightStatus ? statusText : "无记录"
                    }`}
                  >
                    <span>{cell.day}</span>
                    <CalendarPoopMarker hasRecord={count > 0} selected={selected} />
                    {hasLightStatus ? (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#ece6dc] px-1.5 text-[10px] text-[#8f7e68]">
                        {statusText}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>

            {loadingMonth ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="toy-card py-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-[var(--toy-ink)]">
              {selectedDate} 的记录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingRecords ? <Skeleton className="h-10 w-full rounded-xl" /> : null}
            {!loadingRecords && selectedRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">当天暂无记录</p>
            ) : null}
            {!loadingRecords
              ? selectedRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={`/records/${record.id}`}
                    className="block rounded-xl border border-[#ecd8c2] bg-[#fffdf7] px-3 py-2 text-sm text-[var(--toy-ink)] transition hover:bg-[#fff7ef]"
                  >
                    {formatDateTime(record.record_time)}
                  </Link>
                ))
              : null}
          </CardContent>
        </Card>
      </FadeIn>

      {errorMessage ? (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}
    </section>
  );
}
