"use client";

import { CalendarDays, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlySummaryCardProps = {
  monthCount: number;
};

export function MonthlySummaryCard({ monthCount }: MonthlySummaryCardProps) {
  return (
    <Card className="toy-card-sticker relative overflow-hidden py-0">
      <CardHeader className="px-5 pb-1 pt-4">
        <CardTitle className="flex items-center gap-2 text-base text-[var(--toy-ink)]">
          <CalendarDays className="size-4 text-[#6da08a]" />
          本月顺顺卡
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-[#ead7c0] bg-white/85 p-4">
          <span className="toy-chip absolute right-3 top-3 flex items-center gap-1 text-[var(--toy-ink)]">
            <Star className="size-3" />贴纸
          </span>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-[color:rgba(92,74,65,0.75)]">本月已记录</p>
              <p className="text-5xl font-semibold tracking-tight text-[var(--toy-ink)]">{monthCount}</p>
            </div>
            <motion.div
              animate={{ rotate: [0, -7, 0, 7, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              className="toy-icon-bubble p-3 text-[#d79653]"
            >
              <Sparkles className="size-7" />
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
