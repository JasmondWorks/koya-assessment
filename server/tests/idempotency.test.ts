import { describe, expect, it } from "vitest";
import { authed, FUTURE_SLOT, resetWithSlots } from "./helpers";

describe("Idempotency-Key", () => {
  it("replays the exact same response and booking id for a repeated key + same body", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const body = { slot_id: "s1", name: "Ada", email: "ada@example.com" };

    const first = await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k1")
      .send(body)
      .expect(201);

    const replay = await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k1")
      .send(body)
      .expect(201);

    expect(replay.body.id).toBe(first.body.id);

    // No second booking was created — only one confirmed booking exists.
    const slots = await authed().get("/slots").expect(200);
    expect(slots.body.slots[0].available).toBe(false);
  });

  it("422s when the same key is reused with a different body", async () => {
    await resetWithSlots([FUTURE_SLOT]);

    await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k2")
      .send({ slot_id: "s1", name: "Ada", email: "ada@example.com" })
      .expect(201);

    const res = await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k2")
      .send({ slot_id: "s1", name: "Different Name", email: "ada@example.com" });

    expect(res.status).toBe(422);
  });

  it("replays a cached FAILURE response too, not just successes", async () => {
    await resetWithSlots([FUTURE_SLOT]);

    const first = await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k3")
      .send({ slot_id: "nope", name: "Ada", email: "ada@example.com" });
    expect(first.status).toBe(404);

    const replay = await authed()
      .post("/bookings")
      .set("Idempotency-Key", "k3")
      .send({ slot_id: "nope", name: "Ada", email: "ada@example.com" });
    expect(replay.status).toBe(404);
    expect(replay.body).toEqual(first.body);
  });

  it("requests without a key are never cached or linked to each other", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const first = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada", email: "ada@example.com" })
      .expect(201);

    const second = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Bob", email: "bob@example.com" });

    // Second request has no Idempotency-Key, so it's independently
    // evaluated against current state — and loses the race since the
    // slot's already taken by `first`.
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });
});
