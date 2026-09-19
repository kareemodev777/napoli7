"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { OrderingAvailability } from "@/lib/ordering-hours";

/**
 * Whether the kitchen is taking orders right now, shared by every component that
 * asks.
 *
 * This used to fetch per hook call. That reads as one request until you notice
 * who calls it: `MenuProductCard` does, and the menu renders one card per
 * product — so opening the menu fired forty-odd identical `/api/ordering-status`
 * requests at once, plus more from the cart, the bottom bar and the product
 * page. They all want the same answer to the same question.
 *
 * So the fetch lives in one module-level store instead: the first component to
 * ask starts it, everyone mounted at the time waits on that same promise, and
 * the answer is cached briefly so navigating between pages doesn't re-ask. The
 * hook's shape is unchanged, so no call site had to move.
 */

/** How long a loaded answer is reused before the next mount refetches it. The
 *  shop opening or closing mid-session should show up without a reload, but it
 *  does not need to be watched second by second. */
const FRESH_MS = 60_000;

interface Snapshot {
  availability: OrderingAvailability | null;
  loading: boolean;
}

const PENDING: Snapshot = { availability: null, loading: true };

// One object identity per distinct state — `useSyncExternalStore` compares
// snapshots by reference and would loop forever on a fresh object each read.
let snapshot: Snapshot = PENDING;
let fetchedAtMs = 0;
let inFlight: Promise<void> | null = null;

const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = (): Snapshot => snapshot;
// The server has no cached answer to offer and must not start a fetch; the first
// client render takes over from here.
const getServerSnapshot = (): Snapshot => PENDING;

function load(): Promise<void> {
  // Someone else already asked and hasn't heard back — wait on their request
  // rather than opening a second one.
  if (inFlight) return inFlight;
  if (snapshot.availability !== null && Date.now() - fetchedAtMs < FRESH_MS) {
    return Promise.resolve();
  }

  inFlight = (async () => {
    try {
      const res = await fetch("/api/ordering-status", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load ordering status");
      const data = (await res.json()) as OrderingAvailability;
      fetchedAtMs = Date.now();
      setSnapshot({ availability: data, loading: false });
    } catch {
      // Keep the UI usable even if the status endpoint is temporarily down —
      // but stop reporting "loading", or every caller spins forever.
      setSnapshot({ availability: snapshot.availability, loading: false });
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function useOrderingAvailability(): Snapshot {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void load();
  }, []);

  return state;
}
