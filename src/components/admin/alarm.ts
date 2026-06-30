// Shared admin "new order" alarm. Plays the order sound at /sounds/order-alarm.mp3.
// The notification provider re-calls playAlarm() on an interval while orders
// await acceptance, so the sound repeats until the admin acknowledges (opens
// notifications or goes to the orders page). Browsers block audio until the user
// interacts with the page, so callers should invoke unlockAlarm() from a real
// click/tap once (it's a no-op afterwards).

const SOUND_URL = "/sounds/order-alarm.mp3";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(SOUND_URL);
    audio.preload = "auto";
  }
  return audio;
}

/**
 * Prime audio playback from a user gesture so later programmatic plays are
 * allowed by the browser's autoplay policy. A muted play→pause inside the
 * gesture satisfies it. No-op after the first successful unlock.
 */
export function unlockAlarm(): void {
  const a = getAudio();
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

/** Play the order alarm once (+ a short vibrate on mobile). Safe to call anytime. */
export function playAlarm(): void {
  const a = getAudio();
  if (a) {
    try {
      a.currentTime = 0;
      a.play().catch(() => {
        // Autoplay blocked (not unlocked yet) — ignore.
      });
    } catch {
      // Never let an audio failure break the caller.
    }
  }
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    // vibrate is best-effort.
  }
}
