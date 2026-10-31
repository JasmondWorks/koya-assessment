/** Domain types for the booking API. */

export interface Slot {
  id: string;
  provider: string;
  /** ISO 8601 date-time string, e.g. "2026-12-10T09:00:00Z" */
  start: string;
  end: string;
}

/** What GET /slots returns — a Slot plus whether it can still be booked. */
export interface SlotWithAvailability extends Slot {
  available: boolean;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: BookingStatus;
  /** ISO 8601 date-time string. */
  created_at: string;
}

/** The shape every error response uses. */
export interface ApiErrorBody {
  error: string;
}
