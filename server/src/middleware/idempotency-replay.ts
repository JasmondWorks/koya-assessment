/**
 * Short-circuits POST /bookings with a cached response when the
 * Idempotency-Key header matches a key we've already completed a
 * request for. This runs BEFORE the rate limiter and BEFORE validation
 * — see lib/idempotency.ts's module comment for why: replaying an
 * already-settled attempt isn't a new attempt, and shouldn't consume
 * the client's rate-limit budget or get re-validated.
 *
 * A key we haven't seen yet (no cache entry) falls through to `next()`
 * and is handled the normal way, including being cached for the first
 * time, by `withIdempotency` inside the controller.
 */
import type { NextFunction, Request, Response } from "express";
import { unprocessable } from "../lib/http-error";
import { fingerprint } from "../lib/idempotency";
import { store } from "../lib/store";

export async function replayIdempotentBookingIfCached(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const key = req.header("Idempotency-Key");
  if (!key) {
    next();
    return;
  }

  const existing = await store.getIdempotencyRecord(key);
  if (!existing) {
    next();
    return;
  }

  if (existing.bodyFingerprint !== fingerprint(req.body)) {
    next(
      unprocessable(
        "Idempotency-Key was already used with a different request body",
      ),
    );
    return;
  }

  // Exact replay: send back precisely what the first attempt produced,
  // success or failure, without touching the service layer again.
  for (const [header, value] of Object.entries(existing.responseHeaders)) {
    res.setHeader(header, value);
  }
  res.status(existing.statusCode).json(existing.responseBody);
}
