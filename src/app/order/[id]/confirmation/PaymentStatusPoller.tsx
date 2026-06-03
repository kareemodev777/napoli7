"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Card payment is confirmed asynchronously by the Stripe webhook, so right after
 * the redirect the order is usually still `pending`. This refreshes the server
 * component every few seconds until the webhook lands (or we give up), flipping
 * the page to the paid/failed state without the customer touching anything.
 */
export function PaymentStatusPoller({
  intervalMs = 3000,
  maxAttempts = 20,
}: {
  intervalMs?: number;
  maxAttempts?: number;
}) {
  const router = useRouter();
  const attempts = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      attempts.current += 1;
      if (attempts.current > maxAttempts) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [router, intervalMs, maxAttempts]);

  return null;
}
