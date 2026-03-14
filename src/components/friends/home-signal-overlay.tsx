"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import type { InteractionFeedItem } from "@/services/interaction.service";
import type { InteractionType } from "@/types/database";

const signalMeta: Record<InteractionType, { emoji: string; text: string }> = {
  heart: { emoji: "💖", text: "送来一个爱心" },
  clap: { emoji: "👏", text: "送来一个鼓掌" },
  drink_water: { emoji: "💧", text: "提醒你喝水" },
  cheer: { emoji: "✨", text: "发来一个顺顺顺" },
};

type HomeSignalOverlayProps = {
  interactions: InteractionFeedItem[];
  viewerUserId: string | null;
  friendName: string;
};

const SIGNAL_TOTAL_MS = 8000;
const FADE_IN_MS = 600;
const FADE_OUT_MS = 1000;
const VISIBLE_BEFORE_EXIT_MS = SIGNAL_TOTAL_MS - FADE_OUT_MS;
const QUEUE_GAP_MS = 140;

export function HomeSignalOverlay({
  interactions,
  viewerUserId,
  friendName,
}: HomeSignalOverlayProps) {
  const queue = useMemo(
    () =>
      interactions
        .filter((item) => item.sender_user_id !== viewerUserId && item.status === "sent")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3),
    [interactions, viewerUserId],
  );

  const queueKey = useMemo(
    () => queue.map((item) => `${item.id}:${item.status}`).join("|"),
    [queue],
  );

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [visible, setVisible] = useState(false);
  const lastPlayedRef = useRef<string>("");

  useEffect(() => {
    if (queue.length === 0 || !queueKey || queueKey === lastPlayedRef.current) {
      return;
    }

    lastPlayedRef.current = queueKey;

    const timeouts: number[] = [];

    const playNext = (index: number) => {
      const hideTimer = window.setTimeout(() => {
        setVisible(false);

        const next = index + 1;
        if (next >= queue.length) {
          const doneTimer = window.setTimeout(() => {
            setCurrentIndex(-1);
          }, FADE_OUT_MS);
          timeouts.push(doneTimer);
          return;
        }

        const showTimer = window.setTimeout(() => {
          setCurrentIndex(next);
          setVisible(true);
          playNext(next);
        }, QUEUE_GAP_MS);

        timeouts.push(showTimer);
      }, VISIBLE_BEFORE_EXIT_MS);

      timeouts.push(hideTimer);
    };

    const startTimer = window.setTimeout(() => {
      setCurrentIndex(0);
      setVisible(true);
      playNext(0);
    }, 0);
    timeouts.push(startTimer);

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [queue, queueKey]);

  if (currentIndex < 0 || !queue[currentIndex]) {
    return null;
  }

  const item = queue[currentIndex];
  const meta = signalMeta[item.interaction_type];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 -translate-y-1/2 px-4">
      <AnimatePresence>
        {visible ? (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: currentIndex % 2 === 0 ? -26 : 26, y: 6, scale: 0.96 }}
            animate={{
              opacity: [0, 1, 1],
              x: [currentIndex % 2 === 0 ? -26 : 26, 0, currentIndex % 2 === 0 ? 10 : -10],
              y: [6, 0, -5],
              scale: [0.96, 1, 1.01],
            }}
            exit={{
              opacity: 0,
              x: currentIndex % 2 === 0 ? 20 : -20,
              y: -8,
              scale: 0.98,
              transition: { duration: FADE_OUT_MS / 1000, ease: "easeOut" },
            }}
            transition={{
              duration: VISIBLE_BEFORE_EXIT_MS / 1000,
              ease: "easeOut",
              times: [0, FADE_IN_MS / VISIBLE_BEFORE_EXIT_MS, 1],
            }}
            className="mx-auto w-fit rounded-full border border-[#e9d3bd] bg-[#fff8ef]/95 px-4 py-2 text-sm text-[var(--toy-ink)] shadow-md"
          >
            <span className="mr-1" aria-hidden>
              {meta.emoji}
            </span>
            <span>{friendName}{meta.text}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
