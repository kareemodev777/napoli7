"use client";

import { Volume2 } from "lucide-react";
import { playAlarm, unlockAlarm } from "./alarm";

/**
 * Icon button: click once to UNLOCK browser audio (required before any
 * auto-chime can play) and hear a test of the new-order alarm. After this
 * click, the bell's automatic chime works for the rest of the session.
 */
export function TestAlarmButton() {
  return (
    <button
      type="button"
      onClick={() => {
        unlockAlarm();
        playAlarm();
      }}
      aria-label="Test the new-order sound"
      title="Test the new-order sound (also enables it for this session)"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Volume2 className="h-4 w-4" strokeWidth={1.7} aria-hidden />
    </button>
  );
}
