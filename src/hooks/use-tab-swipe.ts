import { useRef } from "react";
import type { TouchEvent } from "react";

import { getSwipeThreshold } from "@/components/layout/tab-config";

type SwipeDirection = "left" | "right";

type UseTabSwipeParams = {
  pathname: string;
  enabled: boolean;
  onSwipe: (direction: SwipeDirection) => void;
};

const EDGE_GESTURE_GUARD_PX = 24;

function shouldBlockSwipe() {
  const active = document.activeElement as HTMLElement | null;
  if (active) {
    const tag = active.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) {
      return true;
    }
  }

  return Boolean(document.querySelector('[data-swipe-lock="true"]'));
}

export function useTabSwipe({ pathname, enabled, onSwipe }: UseTabSwipeParams) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const deltaXRef = useRef(0);
  const deltaYRef = useRef(0);
  const trackingRef = useRef(false);
  const horizontalRef = useRef(false);

  const reset = () => {
    trackingRef.current = false;
    horizontalRef.current = false;
    deltaXRef.current = 0;
    deltaYRef.current = 0;
  };

  const onTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (!enabled || event.touches.length !== 1) {
      reset();
      return;
    }

    if (shouldBlockSwipe()) {
      reset();
      return;
    }

    const touch = event.touches[0];
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    if (
      touch.clientX <= EDGE_GESTURE_GUARD_PX ||
      touch.clientX >= viewportWidth - EDGE_GESTURE_GUARD_PX
    ) {
      // Avoid fighting browser/system edge-swipe gestures.
      reset();
      return;
    }

    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    trackingRef.current = true;
    horizontalRef.current = false;
    deltaXRef.current = 0;
    deltaYRef.current = 0;
  };

  const onTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (!trackingRef.current || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    deltaXRef.current = dx;
    deltaYRef.current = dy;

    if (!horizontalRef.current) {
      if (Math.abs(dx) < 10) {
        return;
      }

      horizontalRef.current = Math.abs(dx) > Math.abs(dy) * 1.25;
    }

    if (horizontalRef.current && event.cancelable) {
      event.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (!trackingRef.current || !horizontalRef.current) {
      reset();
      return;
    }

    const dx = deltaXRef.current;
    const dy = deltaYRef.current;
    reset();

    if (Math.abs(dx) <= Math.abs(dy) * 1.25) {
      return;
    }

    const threshold = getSwipeThreshold(pathname);
    if (Math.abs(dx) < threshold) {
      return;
    }

    onSwipe(dx < 0 ? "left" : "right");
  };

  const onTouchCancel = () => {
    reset();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
