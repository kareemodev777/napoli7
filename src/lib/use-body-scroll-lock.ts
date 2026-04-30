"use client";

import { useEffect } from "react";

/**
 * Locks <body> scroll while a drawer or modal is open.
 * Compensates for scrollbar width to prevent layout shift.
 * Cleans up (restores scroll) on unmount.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const prev = document.body.style.paddingRight;
    document.body.setAttribute("data-scroll-lock", "true");
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.removeAttribute("data-scroll-lock");
      document.body.style.overflow = "";
      document.body.style.paddingRight = prev;
    };
  }, [locked]);
}
