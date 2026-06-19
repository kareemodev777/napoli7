"use client";

import { useEffect, useState } from "react";
import type { OrderingAvailability } from "@/lib/ordering-hours";

export function useOrderingAvailability() {
  const [availability, setAvailability] = useState<OrderingAvailability | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch("/api/ordering-status", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load ordering status");
        const data = (await res.json()) as OrderingAvailability;
        if (alive) setAvailability(data);
      } catch {
        // Keep the UI usable even if the status endpoint is temporarily down.
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  return { availability, loading };
}
