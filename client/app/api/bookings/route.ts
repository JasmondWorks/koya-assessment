/**
 * Same-origin endpoint the browser calls to create a booking. This is
 * the one piece of the booking flow that genuinely needs a Route
 * Handler rather than a direct Server Component fetch: it's triggered
 * by a client-side form submission, and the browser has no way to
 * attach the backend's API key itself — nor should it. This handler
 * runs server-side, attaches the key, and forwards the request.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BackendApiError, createBooking } from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.json();

  // The browser never sees or sets this — generating it here means a
  // genuine double-submit (e.g. a user double-clicking "Book") is still
  // idempotent, without the client needing to know idempotency keys
  // exist. A real double-click fires two separate POSTs to this route,
  // each with its OWN fresh key, so this alone doesn't dedupe a
  // double-click — see the booking form's own submit-guard for that
  // half of the protection.
  const idempotencyKey = randomUUID();

  try {
    const booking = await createBooking(body, idempotencyKey);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}
