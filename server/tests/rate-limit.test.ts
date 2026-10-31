import { describe, expect, it } from "vitest";
import { authed, resetWithSlots } from "./helpers";

describe("per-email rate limiting on POST /bookings", () => {
  it("allows 5 attempts per minute, including failed ones, then 429s on the 6th", async () => {
    await resetWithSlots([]);
    const email = "limited@example.com";

    const results: number[] = [];
    for (let i = 0; i < 6; i++) {
      // Every attempt targets a nonexistent slot, so each one fails with
      // 404 — proving the limiter counts FAILED attempts, exactly as the
      // the limiter is supposed to, not just successful bookings.
      const res = await authed()
        .post("/bookings")
        .send({ slot_id: `nope-${i}`, name: "Limited", email });
      results.push(res.status);
    }

    expect(results.slice(0, 5)).toEqual([404, 404, 404, 404, 404]);
    expect(results[5]).toBe(429);
  });

  it("sets a Retry-After header, in whole seconds, on the 429", async () => {
    await resetWithSlots([]);
    const email = "limited2@example.com";

    for (let i = 0; i < 5; i++) {
      await authed()
        .post("/bookings")
        .send({ slot_id: `nope-${i}`, name: "Limited", email });
    }

    const sixth = await authed()
      .post("/bookings")
      .send({ slot_id: "nope-6", name: "Limited", email });

    expect(sixth.status).toBe(429);
    expect(sixth.headers["retry-after"]).toBeDefined();
    expect(Number.isInteger(Number(sixth.headers["retry-after"]))).toBe(true);
  });

  it("does not affect a different email", async () => {
    await resetWithSlots([{ id: "free", provider: "P", start: "2026-12-10T09:00:00Z", end: "2026-12-10T09:30:00Z" }]);

    for (let i = 0; i < 5; i++) {
      await authed()
        .post("/bookings")
        .send({ slot_id: `nope-${i}`, name: "Limited", email: "limited3@example.com" });
    }

    const otherEmail = await authed()
      .post("/bookings")
      .send({ slot_id: "free", name: "Unaffected", email: "unaffected@example.com" });

    expect(otherEmail.status).toBe(201);
  });
});
