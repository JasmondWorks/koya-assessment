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

export function MyBookings() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function fetchPage(cursor?: string) {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ email, limit: "10" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      const body = await res.json();

      if (!res.ok) {
        setError(body.error ?? "Could not load bookings");
        return;
      }

      setBookings((prev) => (cursor ? [...prev, ...body.bookings] : body.bookings));
      setNextCursor(body.next_cursor);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setHasSearched(true);
    setBookings([]);
    setNextCursor(null);
    await fetchPage();
  }

  async function handleCancel(id: string) {
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (res.ok) {
      setBookings((prev) => prev.map((b) => (b.id === id ? body : b)));
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-end gap-2">
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {hasSearched && bookings.length === 0 && !isLoading && !error && (
        <p className="text-sm text-muted-foreground">No bookings found.</p>
      )}

      {bookings.length > 0 && (
        <ul className="space-y-2">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <p className="text-sm font-medium">{booking.id}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                  {booking.status}
                </Badge>
                {booking.status === "confirmed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(booking.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <Button
          variant="secondary"
          onClick={() => fetchPage(nextCursor)}
          disabled={isLoading}
        >
          {isLoading ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
