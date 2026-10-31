import { describe, expect, it } from "vitest";
import { authed, FUTURE_SLOT, resetWithSlots } from "./helpers";

describe("concurrent booking attempts on the same slot", () => {
  it("lets exactly one of many simultaneous requests win", async () => {
    await resetWithSlots([FUTURE_SLOT]);

    // Fire 25 requests without awaiting between them — Promise.all starts
    // them all before any has finished, which is what actually exercises
    // the race. Awaiting each one in a loop would serialize them and
    // prove nothing about the atomicity guarantee in store.ts.
    const attempts = Array.from({ length: 25 }, (_, i) =>
      authed()
        .post("/bookings")
        .send({
          slot_id: "s1",
          name: `Racer ${i}`,
          email: `racer${i}@example.com`,
        }),
    );

    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status).sort();

    const successes = statuses.filter((s) => s === 201);
    const conflicts = statuses.filter((s) => s === 409);

    expect(successes).toHaveLength(1);
    expect(conflicts).toHaveLength(24);

    // And the store agrees: only one confirmed booking exists for this
    // slot afterward.
    const slots = await authed().get("/slots").expect(200);
    expect(slots.body.slots[0].available).toBe(false);
  });
});
