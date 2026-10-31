/**
 * Idempotency-Key handling for POST /bookings:
 *
 *   - same key + same body       -> replay the exact original response
 *                                    (success or failure), never create
 *                                    a second booking.
 *   - same key + different body  -> 422, no processing.
 *   - no key                      -> normal processing, nothing cached.
 *
 * Design: every outcome in this app already flows through one of two
 * channels — a thrown `HttpError` for failures, or a returned value for
 * success (see http-error.ts / error-handler.ts). This module replays
 * through the SAME two channels rather than inventing a third ("return
 * an HttpResult object the caller must know to unwrap"), so the
 * controller that calls `withIdempotency` looks exactly like a controller
 * that doesn't use it.
 *
 * Scope note: this function handles the "first time we see this key"
 * path — running `produce()` and caching whatever it returns or throws.
 * The "we've seen this key before, with this exact body" replay path is
 * handled earlier, by `middleware/idempotency-replay.ts`, which runs
 * BEFORE the rate limiter. That ordering is deliberate: a replay of an
 * already-completed attempt is not a new "attempt" in the sense the
 * rate limiter cares about — a client retrying the same
 * Idempotency-Key after a dropped connection shouldn't be charged
 * against their 5-per-minute budget for doing the safe, correct thing.
 * Body-shape validation still only runs on a genuine first attempt,
 * same as before.
 */
import { HttpError, unprocessable } from "./http-error";
import { store } from "./store";

const SUCCESS_STATUS = 201;

/**
 * Deterministic JSON stringify — sorts object keys so semantically
 * identical bodies with differently-ordered keys produce the same
 * fingerprint. Plain `JSON.stringify` preserves key insertion order,
 * which would treat `{a,b}` and `{b,a}` as "different bodies" even
 * though no real client distinguishes them.
 */
export function fingerprint(value: unknown): string {
  const sortKeys = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(sortKeys);
    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => [key, sortKeys(val)]),
      );
    }
    return input;
  };
  return JSON.stringify(sortKeys(value));
}

/**
 * Runs `produce()` under idempotency-key protection.
 *
 * - No key: runs `produce()` and returns/throws exactly what it does —
 *   a pure passthrough.
 * - New key: runs `produce()`, caches whichever outcome (success value
 *   or HttpError) it produced, then returns/throws that same outcome.
 * - Repeated key, same body: replays the cached outcome without calling
 *   `produce()` again — so a second booking is never created.
 * - Repeated key, different body: throws 422 without calling `produce()`.
 *
 * A non-`HttpError` thrown by `produce()` (a genuine bug, not an
 * expected failure) is never cached — it propagates straight through,
 * same as it would anywhere else in the app.
 */
export async function withIdempotency<T>(
  key: string | undefined,
  requestBody: unknown,
  produce: () => Promise<T>,
): Promise<T> {
  if (!key) {
    return produce();
  }

  const bodyFingerprint = fingerprint(requestBody);
  const existing = await store.getIdempotencyRecord(key);

  if (existing) {
    if (existing.bodyFingerprint !== bodyFingerprint) {
      throw unprocessable(
        "Idempotency-Key was already used with a different request body",
      );
    }
    if (existing.statusCode === SUCCESS_STATUS) {
      return existing.responseBody as T;
    }
    throw new HttpError(
      existing.statusCode,
      (existing.responseBody as { error: string }).error,
      existing.responseHeaders,
    );
  }

  try {
    const result = await produce();
    await store.saveIdempotencyRecord(key, {
      bodyFingerprint,
      statusCode: SUCCESS_STATUS,
      responseBody: result,
      responseHeaders: {},
    });
    return result;
  } catch (error) {
    if (error instanceof HttpError) {
      await store.saveIdempotencyRecord(key, {
        bodyFingerprint,
        statusCode: error.statusCode,
        responseBody: { error: error.message },
        responseHeaders: error.headers,
      });
    }
    // Re-throw regardless of whether we cached it — this call site
    // always communicates failure the same way the rest of the app
    // does: by throwing.
    throw error;
  }
}
