/**
 * Centralized error handling middleware — registered LAST in app.ts.
 *
 * Express identifies an error-handling middleware purely by its arity:
 * it must declare exactly 4 parameters `(err, req, res, next)`. Dropping
 * to 3 params turns this silently back into a normal middleware that
 * Express will never route errors into — the 4-arg signature is not
 * decorative.
 *
 * Express 5 (what this project uses) automatically forwards rejected
 * promises from async route handlers into this middleware, so there's no
 * need for the `asyncHandler`-wrapper pattern that's required on Express 4
 * — a thrown error inside an `async (req, res) => {...}` handler lands
 * here on its own.
 */
import type { ErrorRequestHandler } from "express";
import { HttpError } from "../lib/http-error";
import type { ApiErrorBody } from "../types";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    // An operational error we threw on purpose — we know exactly what
    // status/message/headers it should produce. Safe to send as-is
    // because every `HttpError` message is something *we* wrote.
    for (const [header, value] of Object.entries(err.headers)) {
      res.setHeader(header, value);
    }
    const body: ApiErrorBody = { error: err.message };
    res.status(err.statusCode).json(body);
    return;
  }

  // Anything else is a bug, not an expected failure: a null reference, a
  // JSON parse error from a malformed request body, a dependency
  // throwing something we didn't anticipate. We log the real error
  // (stack included) for ourselves, but the client only ever gets a
  // generic message — never a stack trace, file path, or internal detail,
  // which could leak information useful to an attacker or just be
  // confusing API noise.
  // eslint-disable-next-line no-console -- no structured logger is
  // wired up yet; stderr is the honest choice here.
  console.error("Unhandled error:", err);

  const body: ApiErrorBody = { error: "internal server error" };
  res.status(500).json(body);
};
