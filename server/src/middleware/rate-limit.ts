/**
 * Per-email rate limiting for POST /bookings: at most 5 attempts per
 * email per minute, failed attempts included. The 6th attempt in the
 * window gets 429 + Retry-After; other emails are unaffected.
 *
 * This is a sliding-window counter, not a fixed-window one: a fixed
 * window (e.g. "5 per clock-minute") lets a client burst 5 at 59s and
 * another 5 at 61s — 10 in two seconds. A sliding window keeps a
 * timestamp per attempt and only counts the ones still inside the last
 * 60 seconds from *now*, which is what "per minute" actually implies.
 *
 * Deliberately scoped to this one route rather than applied globally —
 * a global rate limiter would need a different key entirely (IP?),
 * since "per email" only exists once the body has been parsed.
 */
import type { NextFunction, Request, Response } from "express";
import { tooManyRequests } from "../lib/http-error";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

// email -> timestamps (ms since epoch) of attempts still inside the window.
// Same "no await in the critical section" reasoning as store.ts applies
// here too: read-then-write on this Map must stay synchronous so two
// near-simultaneous requests for the same email can't both read "4
// attempts so far" and both proceed.
const attemptsByEmail = new Map<string, number[]>();

function normalizeEmailForRateLimitKey(rawEmail: unknown): string | null {
  // We rate-limit by email, but email hasn't been validated yet at this
  // point in the pipeline (rate limiting runs before schema validation,
  // specifically so that failed/invalid attempts still count toward the
  // limit). So we only require that something string-shaped and
  // non-empty was sent — we are not validating it as a real email
  // address here, just using it as a rate-limit bucket key.
  if (typeof rawEmail !== "string") return null;
  const trimmed = rawEmail.trim();
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}

export function rateLimitBookingAttempts(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const email = normalizeEmailForRateLimitKey(
    (req.body as Record<string, unknown> | undefined)?.email,
  );

  // No usable email to key on — nothing to rate-limit yet. Validation
  // further down the chain will reject this with 400 on its own merits.
  if (email === null) {
    next();
    return;
  }

  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const existing = attemptsByEmail.get(email) ?? [];

  // Prune timestamps that have fallen out of the window. Doing this on
  // every request (rather than a background sweep) keeps the map from
  // growing unboundedly for a quiet email, at the cost of a small, bounded
  // amount of array work per request — a reasonable tradeoff at this
  // scale, and avoids running a separate timer/interval.
  const recent = existing.filter((timestamp) => timestamp > windowStart);

  if (recent.length >= MAX_ATTEMPTS_PER_WINDOW) {
    const oldestInWindow = recent[0] as number;
    const retryAfterSeconds = Math.ceil(
      (oldestInWindow + WINDOW_MS - now) / 1000,
    );
    // Record this attempt too — failed attempts count toward the limit,
    // and a request we're blocking is itself an attempt — but don't let
    // the array grow past what the window needs.
    attemptsByEmail.set(email, [...recent, now]);
    next(
      tooManyRequests(
        "too many booking attempts for this email, try again later",
        Math.max(retryAfterSeconds, 1),
      ),
    );
    return;
  }

  attemptsByEmail.set(email, [...recent, now]);
  next();
}
