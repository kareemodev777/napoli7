"use client";

import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "napoli7.cookie-consent";

const noopSubscribe = () => () => {};

function readConsent(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(STORAGE_KEY));
}

export function CookieBar() {
  // Read localStorage on the client; default to "accepted" on the server so the bar never SSRs.
  const consented = useSyncExternalStore(
    noopSubscribe,
    readConsent,
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);

  if (consented || dismissed) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    }
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-40 bg-foreground text-background px-6 md:px-10 py-4"
    >
      <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-sm">
        <p className="font-display">
          We use essential cookies to run the site and improve your experience.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="font-display text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline"
        >
          Accept &amp; close
        </button>
      </div>
    </div>
  );
}
