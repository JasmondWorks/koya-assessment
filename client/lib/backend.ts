/**
 * Server-only client for the booking API. Every call here attaches the
 * API key on the server side — this module must never be imported from
 * a Client Component, or the key would end up in the browser bundle.
 * Route Handlers and Server Components are the only safe callers.
 */
import "server-only";

const BACKEND_API_URL = process.env.BACKEND_API_URL;
const BACKEND_API_KEY = process.env.BACKEND_API_KEY;

if (!BACKEND_API_URL || !BACKEND_API_KEY) {
  throw new Error(
    "BACKEND_API_URL and BACKEND_API_KEY must be set (see .env.local.example)",
  );
}

export interface Slot {
  id: string;
  provider: string;
  start: string;
  end: string;
  available: boolean;
}

export interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  created_at: string;
}

export class BackendApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BACKEND_API_KEY as string,
      ...init?.headers,
    },
    // This data changes whenever someone books a slot — never cache it.
    cache: "no-store",
  });

  const body = await res.json();

  if (!res.ok) {
    throw new BackendApiError(res.status, body.error ?? "request failed");
  }

  return body as T;
}

export function listSlots(provider?: string): Promise<{ slots: Slot[] }> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : "";
  return request(`/slots${query}`);
}

export function createBooking(
  input: { slot_id: string; name: string; email: string },
  idempotencyKey: string,
): Promise<Booking> {
  return request("/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
}
