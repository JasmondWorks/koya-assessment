/**
 * API key authentication — a single shared secret checked against every
 * request. There's no per-user identity here, no `req.user` to attach,
 * which is why this is a flat equality check rather than a
 * token-verification/JWT flow.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { unauthorized } from "../lib/http-error";

/**
 * `!==` on two strings is not constant-time: JS string comparison
 * returns as soon as it finds the first differing character, so the
 * time it takes leaks how many leading characters of a guess were
 * correct. That's a real, if slow, oracle for brute-forcing a secret
 * character-by-character over enough requests — the standard defense
 * is `crypto.timingSafeEqual`, which compares two buffers in constant
 * time regardless of where they first differ.
 *
 * `timingSafeEqual` itself requires both buffers to be the same length
 * (it throws otherwise) — and comparing lengths first would just move
 * the timing leak to "how long is the key," which is its own
 * information leak. Hashing both values first sidesteps that: SHA-256
 * output is always 32 bytes regardless of input length, so the
 * buffers handed to `timingSafeEqual` are always equal-length and the
 * comparison never short-circuits on a length mismatch.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function requireApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const providedKey = req.header("X-API-Key");

  // Explicit undefined/empty check before the comparison, so a missing
  // header and a wrong header produce the exact same error message and
  // status — we don't need to distinguish them, and shouldn't leak
  // which case it was.
  if (!providedKey || !constantTimeEquals(providedKey, env.API_KEY)) {
    next(unauthorized("missing or invalid API key"));
    return;
  }

  next();
}
