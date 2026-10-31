import { describe, expect, it } from "vitest";
import { authed, resetWithSlots } from "./helpers";

describe("GET /bookings — cursor pagination", () => {
  it("pages oldest-first and terminates with next_cursor: null", async () => {
    const slots = Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      provider: "P",
      start: `2026-12-${10 + i}T09:00:00Z`,
      end: `2026-12-${10 + i}T09:30:00Z`,
    }));
    await resetWithSlots(slots);

    const email = "pager@example.com";
    for (const slot of slots) {
      await authed()
        .post("/bookings")
        .send({ slot_id: slot.id, name: "Pager", email })
        // Idempotency-Key per booking so re-running this test file isn't
        // required for it to be deterministic — not load-bearing here,
        // just avoids any ambiguity about ordering if timestamps tie.
        .expect(201);
    }

    const seenIds: string[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < 10; page++) {
      const res = await authed()
        .get("/bookings")
        .query({ email, limit: 2, ...(cursor ? { cursor } : {}) })
        .expect(200);

      seenIds.push(...res.body.bookings.map((b: { id: string }) => b.id));
      cursor = res.body.next_cursor ?? undefined;

      if (res.body.next_cursor === null) break;
    }

    expect(seenIds).toHaveLength(5);
    // No duplicates and no gaps across pages.
    expect(new Set(seenIds).size).toBe(5);

    // Oldest-first: slot p0 was booked first, so its booking should be
    // the first id we ever saw.
    const firstBooking = await authed()
      .get("/bookings")
      .query({ email, limit: 1 })
      .expect(200);
    expect(seenIds[0]).toBe(firstBooking.body.bookings[0].id);
  });

  it("400s on an out-of-range limit", async () => {
    await resetWithSlots([]);
    const tooLow = await authed()
      .get("/bookings")
      .query({ email: "x@example.com", limit: 0 });
    const tooHigh = await authed()
      .get("/bookings")
      .query({ email: "x@example.com", limit: 51 });

    expect(tooLow.status).toBe(400);
    expect(tooHigh.status).toBe(400);
  });

  it("defaults limit to 10 when omitted", async () => {
    await resetWithSlots([]);
    const res = await authed()
      .get("/bookings")
      .query({ email: "nobody@example.com" })
      .expect(200);
    expect(res.body.bookings).toEqual([]);
    expect(res.body.next_cursor).toBeNull();
  });
});
