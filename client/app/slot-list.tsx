"use client";

import { useState } from "react";
import type { Slot } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InputField } from "@/components/form/input-field";

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
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-green-900 dark:text-green-100">
              Booking confirmed
            </h2>
            <Badge>{confirmedBooking.status}</Badge>
          </div>
          <dl className="space-y-1 text-sm text-green-800 dark:text-green-200">
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
          </dl>
          <Button variant="outline" size="sm" onClick={() => setConfirmedBooking(null)}>
            Book another slot
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {slots.length === 0 && (
        <li className="text-muted-foreground">No slots available right now.</li>
      )}
      {slots.map((slot) => (
        <li key={slot.id}>
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{slot.provider}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSlotTime(slot.start, slot.end)}
                  </p>
                </div>
                {slot.available ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setOpenSlotId(openSlotId === slot.id ? null : slot.id)
                    }
                  >
                    Book
                  </Button>
                ) : (
                  <Badge variant="secondary">Unavailable</Badge>
                )}
              </div>

              {openSlotId === slot.id && (
                <BookingForm
                  slotId={slot.id}
                  onBooked={(booking) => setConfirmedBooking(booking)}
                />
              )}
            </CardContent>
          </Card>
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
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
      <InputField
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <InputField
        label="Email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Booking…" : "Confirm booking"}
      </Button>
    </form>
  );
}
