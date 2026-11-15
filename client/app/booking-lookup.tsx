"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputField } from "@/components/form/input-field";

interface Booking {
  id: string;
  slot_id: string;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  created_at: string;
}

export function BookingLookup() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setBooking(null);

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Booking not found");
        return;
      }
      setBooking(body);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancel() {
    if (!booking || isCancelling) return;
    setIsCancelling(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not cancel booking");
        return;
      }
      setBooking(body);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleLookup} className="flex items-end gap-2">
        <InputField
          label="Booking ID"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Looking up…" : "Look up"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {booking && (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">{booking.name}</p>
            <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
              {booking.status}
            </Badge>
          </div>
          <dl className="text-sm text-muted-foreground space-y-1">
            <div className="flex gap-2">
              <dt>Booking ID:</dt>
              <dd>{booking.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Email:</dt>
              <dd>{booking.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Created:</dt>
              <dd>{new Date(booking.created_at).toLocaleString()}</dd>
            </div>
          </dl>
          {booking.status === "confirmed" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling…" : "Cancel booking"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
