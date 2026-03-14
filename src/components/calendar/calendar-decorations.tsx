"use client";

import { motion } from "framer-motion";

type CalendarDecorationsProps = {
  variant?: "summary" | "calendar";
};

export function CalendarDecorations({ variant = "calendar" }: CalendarDecorationsProps) {
  if (variant === "summary") {
    return (
      <>
        <span className="absolute left-2 top-3 h-2.5 w-10 rounded-full bg-[#f4d8b9]/70" />
        <span className="absolute right-3 top-2 h-3 w-3 rounded-full bg-[#d8e6ff]" />
        <span className="absolute right-8 top-5 h-2 w-2 rounded-full bg-[#ffe0ea]" />
      </>
    );
  }

  return (
    <>
      <motion.span
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="absolute -left-1 -top-1 h-3.5 w-9 rounded-full bg-[#fff0c8]"
      />
      <span className="absolute -right-2 top-10 h-16 w-16 rounded-full bg-[#e9f1ff]/70 blur-[1px]" />
      <span className="absolute left-6 -bottom-2 h-8 w-20 rounded-full bg-[#ffe4ec]/70" />
    </>
  );
}
