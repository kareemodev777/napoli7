"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires `callback` each time the pathname changes after the initial mount.
 * Used to auto-close the mobile nav drawer on navigation.
 */
export function useRouteChange(callback: () => void): void {
  const pathname = usePathname();
  const callbackRef = useRef(callback);
  const prevPathname = useRef<string | null>(null);

  // Keep the callback ref current without triggering the effect.
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (prevPathname.current === null) {
      // Initial mount — record the pathname but don't fire.
      prevPathname.current = pathname;
      return;
    }
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      callbackRef.current();
    }
  }, [pathname]);
}
