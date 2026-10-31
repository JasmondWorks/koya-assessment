/**
 * Zod schemas are the single source of truth for request shapes — see
 * A generic factory means each route attaches its schema via
 * the generic `validate()` middleware factory (lib/validate.ts) rather
 * than re-checking fields by hand inside the controller.
 */
import { z } from "zod";

// A conservative, dependency-free email check: something@something.tld.
// Good enough to reject obvious garbage ("not-an-email") without pulling
// in a full RFC 5322 validator, which is overkill here and
// would reject plenty of real addresses anyway.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const newBookingSchema = z.object({
  slot_id: z.string().trim().min(1, "slot_id must not be empty"),
  name: z.string().trim().min(1, "name must not be empty"),
  email: z
    .string()
    .trim()
    .min(1, "email must not be empty")
    .toLowerCase()
    .regex(EMAIL_PATTERN, "email is not a valid email address"),
});

export type NewBookingInput = z.infer<typeof newBookingSchema>;

export const listBookingsQuerySchema = z.object({
  email: z.string().trim().min(1, "email is required").toLowerCase(),
  // Query params arrive as strings; z.coerce turns "10" into 10 before
  // the range check runs. An invalid value (non-numeric, out of 1-50)
  // fails validation and the route turns that into a 400.
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
