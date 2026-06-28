// HTTP client for POS pushes: fetch + bounded retry + per-attempt timeout + auth.
// Best-effort — never throws; returns a discriminated result so callers stay
// non-blocking. The "should we retry this outcome?" decision is factored into a
// pure predicate (shouldRetry) so it can be unit-tested without real fetch.

export interface PosPostOptions {
  /** Keyed on order_number; sent as an idempotency header for POS-side dedup. */
  idempotencyKey: string;
  /** Override the retry/backoff/timeout defaults (used by tests). */
  maxAttempts?: number;
  backoffMs?: number[];
  timeoutMs?: number;
}

export type PosPostResult =
  | { ok: true; status: number; attempts: number }
  | { ok: false; status?: number; error: string; attempts: number };

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = [300, 1200];
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Retry decision for a single attempt outcome. Pure and exported for tests.
 *
 * Retry on transient failures only:
 *   - a thrown/aborted request (no HTTP status) — network error or timeout,
 *   - HTTP 5xx (server-side),
 *   - HTTP 429 (rate limited).
 * Do NOT retry other 4xx: a contract/auth error won't fix itself on retry, so we
 * record it as failed and log loudly instead of hammering the POS.
 */
export function shouldRetry(outcome: {
  status?: number;
  errored?: boolean;
}): boolean {
  if (outcome.errored) return true;
  const status = outcome.status;
  if (status === undefined) return true;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

/**
 * Permanent POS errors that retrying can never fix — most notably a duplicate
 * voucher/invoice unique-constraint violation, which means the POS could not
 * assign a unique invoice number and so REJECTED the order (it did not sync).
 * We stop retrying and report a real failure rather than masking it as success
 * or hammering the POS. Pure for tests.
 */
export function isPermanentPosError(body: string): boolean {
  const b = (body ?? "").toLowerCase();
  return (
    b.includes("duplicate entry") ||
    b.includes("voucher_no_unique") ||
    b.includes("integrity constraint")
  );
}

/** Auth headers from env. Bearer + X-API-Key when POS_API_KEY is set; an
 *  optional custom header name overrides X-API-Key. Empty when unconfigured. */
export function buildAuthHeaders(): Record<string, string> {
  const apiKey = process.env["POS_API_KEY"];
  if (!apiKey) return {};
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  const customHeader = process.env["POS_AUTH_HEADER"];
  if (customHeader) {
    headers[customHeader] = apiKey;
  } else {
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST a body to the POS with bounded retry, backoff, and a per-attempt timeout.
 * Never throws; returns a discriminated result. The idempotency key (order_number)
 * is also carried in the body's `id`, so POS-side dedup and our replay are safe.
 */
export async function postToPos(
  url: string,
  body: unknown,
  options: PosPostOptions,
): Promise<PosPostResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": options.idempotencyKey,
    "X-Idempotency-Key": options.idempotencyKey,
    ...buildAuthHeaders(),
  };
  const payload = JSON.stringify(body);

  let lastStatus: number | undefined;
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return { ok: true, status: res.status, attempts: attempt };
      }

      lastStatus = res.status;
      lastError = await res.text().catch(() => "");

      // A permanent POS error (e.g. a duplicate voucher number — the POS could
      // not assign a unique invoice no) will never succeed on retry, and the
      // order did NOT sync. Stop and report it as a real failure.
      if (
        isPermanentPosError(lastError) ||
        !shouldRetry({ status: res.status }) ||
        attempt === maxAttempts
      ) {
        console.error(
          "[pos] push FAILED",
          `attempt ${attempt}/${maxAttempts}`,
          res.status,
          lastError,
        );
        return {
          ok: false,
          status: res.status,
          error: lastError || `HTTP ${res.status}`,
          attempts: attempt,
        };
      }
      console.warn("[pos] push attempt failed, retrying", attempt, res.status);
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error ? e.message : String(e);
      lastStatus = undefined;
      if (attempt === maxAttempts) {
        console.error(
          "[pos] push FAILED (network/timeout)",
          `attempt ${attempt}/${maxAttempts}`,
          lastError,
        );
        return { ok: false, error: lastError, attempts: attempt };
      }
      console.warn(
        "[pos] push attempt errored, retrying",
        attempt,
        lastError,
      );
    }

    // Backoff before the next attempt (index attempt-1 into the schedule).
    await sleep(backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 0);
  }

  // Unreachable in practice (loop returns on the final attempt), but typed safe.
  return {
    ok: false,
    status: lastStatus,
    error: lastError || "exhausted retries",
    attempts: maxAttempts,
  };
}
