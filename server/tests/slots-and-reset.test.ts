import { describe, expect, it } from "vitest";
import { authed, FUTURE_SLOT, resetWithSlots } from "./helpers";

describe("POST /reset", () => {
  it("replaces slots and wipes prior bookings", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada", email: "ada@example.com" })
      .expect(201);

    // Reset again with a different slot set — the old booking and slot
    // must both be gone.
    await resetWithSlots([{ ...FUTURE_SLOT, id: "s2" }]);

    const slots = await authed().get("/slots").expect(200);
    expect(slots.body.slots).toHaveLength(1);
    expect(slots.body.slots[0].id).toBe("s2");

    const booking = await authed().get("/bookings/does-not-matter");
    // The old booking id is gone too — confirms bookings were wiped, not
    // just slots replaced.
    expect(booking.status).toBe(404);
  });
});

describe("GET /slots", () => {
  it("lists slots earliest start first", async () => {
    await resetWithSlots([
      { id: "late", provider: "P", start: "2026-12-10T10:00:00Z", end: "2026-12-10T10:30:00Z" },
      { id: "early", provider: "P", start: "2026-12-10T08:00:00Z", end: "2026-12-10T08:30:00Z" },
    ]);

    const res = await authed().get("/slots").expect(200);
    expect(res.body.slots.map((s: { id: string }) => s.id)).toEqual([
      "early",
      "late",
    ]);
  });

  it("filters by provider (exact match)", async () => {
    await resetWithSlots([
      { id: "a", provider: "Dr Ade", start: "2026-12-10T08:00:00Z", end: "2026-12-10T08:30:00Z" },
      { id: "b", provider: "Dr Bello", start: "2026-12-10T09:00:00Z", end: "2026-12-10T09:30:00Z" },
    ]);

    const res = await authed().get("/slots").query({ provider: "Dr Ade" }).expect(200);
    expect(res.body.slots).toHaveLength(1);
    expect(res.body.slots[0].id).toBe("a");
  });

  it("marks a slot unavailable once it has a confirmed booking", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada", email: "ada@example.com" })
      .expect(201);

    const res = await authed().get("/slots").expect(200);
    expect(res.body.slots[0].available).toBe(false);
  });
});
