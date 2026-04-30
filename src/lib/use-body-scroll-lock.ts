"use client";

import { useEffect } from "react";

/**
 * Reentrant body-scroll lock with a module-level refcount.
 * Multiple consumers (drawer + Radix modal) can call this independently;
 * the lock is applied on the first consumer and released on the last,
 * preventing clobbered scroll-restoration when two callers overlap.
 *
 * Scrollbar-width compensation is computed once on the first lock so it
 * is stable across all concurrent consumers.
 */

let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      // First consumer: capture current state and apply the lock.
      savedOverflow = document.body.style.overflow;
      savedPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.setAttribute("data-scroll-lock", "true");
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        // Last consumer: restore original state.
        document.body.removeAttribute("data-scroll-lock");
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
        savedOverflow = "";
        savedPaddingRight = "";
      }
    };
  }, [locked]);
}
