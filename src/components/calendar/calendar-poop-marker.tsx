"use client";

import { motion } from "framer-motion";

type CalendarPoopMarkerProps = {
  hasRecord: boolean;
  selected: boolean;
};

export function CalendarPoopMarker({ hasRecord, selected }: CalendarPoopMarkerProps) {
  if (!hasRecord) {
    return null;
  }

  return (
    <motion.span
      initial={{ scale: 0.86, opacity: 0.75 }}
      animate={{ scale: selected ? 1.14 : 1, opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px]"
      aria-hidden
    >
      💩
    </motion.span>
  );
}
