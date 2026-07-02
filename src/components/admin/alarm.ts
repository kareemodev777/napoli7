// Shared admin "new order" alarm. Plays the order sound at /sounds/order-alarm.mp3.
// startAlarm() loops the sound natively (reliable across browsers) and it keeps
// ringing until stopAlarm() — the notification provider stops it once the order
// is accepted (status changes) or the admin acknowledges. Browsers block audio
// until the user interacts, so unlockAlarm() must run from a real click/tap once.

const SOUND_URL = "/sounds/order-alarm.mp3";

let loopAudio: HTMLAudioElement | null = null;
let unlocked = false;

function getLoopAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!loopAudio) {
    loopAudio = new Audio(SOUND_URL);
    loopAudio.preload = "auto";
    loopAudio.loop = true; // ring continuously until paused
  }
  return loopAudio;
}

/**
 * Prime audio playback from a user gesture so later programmatic plays are
 * allowed by the browser's autoplay policy. No-op after the first unlock.
 */
export function unlockAlarm(): void {
  const a = getLoopAudio();
  if (!a || unlocked) return;
  a.muted = true;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
      unlocked = true;
    })
    .catch(() => {
      a.muted = false;
    });
}

/** Start the looping order alarm. Rings until stopAlarm(). Idempotent. */
export function startAlarm(): void {
  const a = getLoopAudio();
  if (!a) return;
  if (!a.paused) return; // already ringing
  a.loop = true;
  a.currentTime = 0;
  a.play().catch(() => {
    // Autoplay blocked (not unlocked yet) — will start after the first gesture.
  });
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // vibrate is best-effort.
  }
}

/** Stop the looping order alarm. */
export function stopAlarm(): void {
  if (!loopAudio) return;
  loopAudio.pause();
  loopAudio.currentTime = 0;
}

/**
 * One-shot preview for the "Test sound" button. Uses a throwaway element so it
 * never interferes with the looping alarm's state.
 */
export function playAlarm(): void {
  if (typeof window === "undefined") return;
  try {
    const a = new Audio(SOUND_URL);
    a.play().catch(() => {});
  } catch {
    // Never let an audio failure break the caller.
  }
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    // vibrate is best-effort.
  }
}
