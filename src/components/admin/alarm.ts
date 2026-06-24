// Shared admin "new order" alarm. A single AudioContext is reused across the
// notification bell, the test button, and the orders auto-refresher. Browsers
// block audio until the user interacts with the page, so callers should invoke
// unlockAlarm() from a real click/tap once (it's a no-op afterwards).

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  );
}

/** Create/resume the shared AudioContext. Call from a user gesture to unlock. */
export function unlockAlarm(): void {
  try {
    const Ctor = getCtor();
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    // Audio is best-effort.
  }
}

/** Play a short two-tone chime + vibrate. Safe to call anytime. */
export function playAlarm(): void {
  try {
    const Ctor = getCtor();
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime;
    [
      { at: 0, freq: 880 },
      { at: 0.18, freq: 1175 },
    ].forEach(({ at, freq }) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + at);
      gain.gain.exponentialRampToValueAtTime(0.35, start + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.15);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start + at);
      osc.stop(start + at + 0.16);
    });
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    // Never let an audio failure break the caller.
  }
}
