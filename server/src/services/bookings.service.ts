/**
 * Business logic for bookings. Controllers call these; these call the
 * store. No HTTP concerns (status codes, headers) live here except via
 * the typed `HttpError`s we throw — the controller/error-handler layer
 * decides how those become responses.
 */
import { badRequest, conflict, notFound } from "../lib/http-error";
import { store } from "../lib/store";
import type { Booking } from "../types";
import type { NewBookingInput } from "../validation/booking.schema";

export async function createBooking(input: NewBookingInput): Promise<Booking> {
  const slot = await store.getSlot(input.slot_id);
  if (!slot) {
    throw notFound("slot not found");
  }

  // A slot that has already started can't be booked. Compared against
  // wall-clock "now" at request time, not at validation time — this
  // check depends on mutable state (the current time), not just the
  // shape of the input, so it belongs here rather than in the schema.
  if (new Date(slot.start).getTime() <= Date.now()) {
    throw badRequest("slot has already started");
  }

  const booking = await store.tryCreateBooking(
    slot.id,
    input.name,
    input.email,
  );
  if (!booking) {
    throw conflict("slot already booked");
  }

  return booking;
}

export async function getBookingById(id: string): Promise<Booking> {
  const booking = await store.getBooking(id);
  if (!booking) {
    throw notFound("booking not found");
  }
  return booking;
}

export async function cancelBookingById(id: string): Promise<Booking> {
  const booking = await store.getBooking(id);
  if (!booking) {
    throw notFound("booking not found");
  }
  if (booking.status === "cancelled") {
    throw conflict("booking already cancelled");
  }
  return store.cancelBooking(booking);
}

export interface BookingsPage {
  bookings: Booking[];
  next_cursor: string | null;
}

export async function listBookingsPage(
  email: string,
  limit: number,
  cursor: string | undefined,
): Promise<BookingsPage> {
  const { bookings, nextCursor } = await store.listBookingsByEmailPage(
    email,
    limit,
    cursor,
  );
  return { bookings, next_cursor: nextCursor };
}
