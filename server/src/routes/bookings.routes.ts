import { Router } from "express";
import { withIdempotency } from "../lib/idempotency";
import { replayIdempotentBookingIfCached } from "../middleware/idempotency-replay";
import { rateLimitBookingAttempts } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import * as bookingsService from "../services/bookings.service";
import {
  listBookingsQuerySchema,
  newBookingSchema,
} from "../validation/booking.schema";

export const bookingsRouter = Router();

/**
 * POST /bookings
 *
 * Middleware order on this route matters and encodes this route's own
 * ordering of requirements:
 *
 *   1. replayIdempotentBookingIfCached — runs FIRST: if this exact
 *      Idempotency-Key + body already produced a response, send it back
 *      immediately and stop. A replay of a settled attempt doesn't
 *      consume rate-limit budget or get re-validated — see that
 *      middleware's comment for why.
 *   2. rateLimitBookingAttempts — runs before validation, on purpose:
 *      failed attempts count toward the 5-per-minute limit, so a
 *      request that's about to fail validation still needs to consume
 *      one attempt — but only on a genuinely new attempt, which is
 *      everything that reaches this point.
 *   3. validate(newBookingSchema) — only requests that get this far have
 *      a well-formed body; the controller can trust `req.body`'s shape.
 *   4. the controller — runs the slot lookup / started check / conflict
 *      check via the service, and caches the outcome if an
 *      Idempotency-Key was provided (see lib/idempotency.ts).
 */
bookingsRouter.post(
  "/",
  replayIdempotentBookingIfCached,
  rateLimitBookingAttempts,
  validate(newBookingSchema),
  async (req, res) => {
    const idempotencyKey = req.header("Idempotency-Key");

    const booking = await withIdempotency(idempotencyKey, req.body, () =>
      bookingsService.createBooking(req.body),
    );

    res.status(201).json(booking);
  },
);

/**
 * GET /bookings?email=&limit=&cursor=
 * Cursor-paginated list of one person's bookings, oldest first.
 */
bookingsRouter.get(
  "/",
  validate(listBookingsQuerySchema, "query"),
  async (req, res) => {
    const { email, limit, cursor } = req.query as unknown as {
      email: string;
      limit: number;
      cursor?: string;
    };

    const page = await bookingsService.listBookingsPage(email, limit, cursor);
    res.status(200).json(page);
  },
);

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await bookingsService.getBookingById(
    req.params.id as string,
  );
  res.status(200).json(booking);
});

bookingsRouter.delete("/:id", async (req, res) => {
  const booking = await bookingsService.cancelBookingById(
    req.params.id as string,
  );
  res.status(200).json(booking);
});
