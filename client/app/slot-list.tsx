"use client";

import { useState } from "react";
import type { Slot } from "@/lib/backend";

interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

function formatSlotTime(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `${dateFormatter.format(startDate)} – ${new Intl.DateTimeFormat(
    undefined,
    { timeStyle: "short" },
  ).format(endDate)}`;
}

export function SlotList({ slots }: { slots: Slot[] }) {
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

  if (confirmedBooking) {
    return (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
        <h2 className="text-lg font-medium text-green-900 dark:text-green-100">
          Booking confirmed
        </h2>
        <dl className="mt-4 space-y-1 text-sm text-green-800 dark:text-green-200">
          <div className="flex gap-2">
            <dt className="font-medium">Booking ID:</dt>
            <dd>{confirmedBooking.id}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Name:</dt>
            <dd>{confirmedBooking.name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Email:</dt>
            <dd>{confirmedBooking.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Status:</dt>
            <dd>{confirmedBooking.status}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <ul className="mt-8 space-y-3">
      {slots.length === 0 && (
        <li className="text-zinc-500 dark:text-zinc-400">
          No slots available right now.
        </li>
      )}
      {slots.map((slot) => (
        <li
          key={slot.id}
          className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {slot.provider}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {formatSlotTime(slot.start, slot.end)}
              </p>
            </div>
            {slot.available ? (
              <button
                type="button"
                onClick={() =>
                  setOpenSlotId(openSlotId === slot.id ? null : slot.id)
                }
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Book
              </button>
            ) : (
              <span className="text-sm text-zinc-400">Unavailable</span>
            )}
          </div>

          {openSlotId === slot.id && (
            <BookingForm
              slotId={slot.id}
              onBooked={(booking) => setConfirmedBooking(booking)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function BookingForm({
  slotId,
  onBooked,
}: {
  slotId: string;
  onBooked: (booking: Booking) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Guards against a double-click firing two requests while the first
    // is still in flight — this is the client-side half of the
    // duplicate-booking protection; the server-side half is the
    // Idempotency-Key the proxy route attaches per request.
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slotId, name, email }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }

      onBooked(body);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {isSubmitting ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}
