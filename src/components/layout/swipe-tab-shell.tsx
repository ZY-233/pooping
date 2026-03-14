"use client";

import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { getSwipeTarget, normalizeTabPath } from "@/components/layout/tab-config";
import { useTabSwipe } from "@/hooks/use-tab-swipe";

type SwipeTabShellProps = {
  children: ReactNode;
};

export function SwipeTabShell({ children }: SwipeTabShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const controls = useAnimationControls();

  const [routeDirection, setRouteDirection] = useState(0);
  const navigatingRef = useRef(false);

  const swipeEnabled = useMemo(() => normalizeTabPath(pathname) !== null, [pathname]);

  useEffect(() => {
    // Route settled.
    navigatingRef.current = false;
  }, [pathname]);

  const triggerBoundaryBounce = (direction: "left" | "right") => {
    const amount = direction === "left" ? -14 : 14;
    void controls.start({
      x: [0, amount, 0],
      transition: { duration: 0.28, ease: "easeOut" },
    });
  };

  const handlers = useTabSwipe({
    pathname,
    enabled: swipeEnabled,
    onSwipe: (direction) => {
      if (navigatingRef.current) {
        return;
      }

      const target = getSwipeTarget(pathname, direction);
      if (!target) {
        triggerBoundaryBounce(direction);
        return;
      }

      navigatingRef.current = true;
      setRouteDirection(direction === "left" ? 1 : -1);
      router.push(target);
    },
  });

  return (
    <motion.div
      {...handlers}
      animate={controls}
      className="h-full"
      style={{ touchAction: "pan-y" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: routeDirection * 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{
            opacity: 0,
            x: routeDirection === 0 ? 0 : routeDirection * -16,
          }}
          onAnimationComplete={() => {
            if (routeDirection !== 0) {
              setRouteDirection(0);
            }
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
