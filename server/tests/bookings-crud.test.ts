import { describe, expect, it } from "vitest";
import { authed, FUTURE_SLOT, PAST_SLOT, resetWithSlots } from "./helpers";

describe("POST /bookings — validation", () => {
  it("400s on missing required fields", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const res = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada" }); // no email
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("400s on an invalid email", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const res = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("404s when the slot doesn't exist", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const res = await authed()
      .post("/bookings")
      .send({ slot_id: "nope", name: "Ada", email: "ada@example.com" });
    expect(res.status).toBe(404);
  });

  it("400s when the slot has already started", async () => {
    await resetWithSlots([PAST_SLOT]);
    const res = await authed()
      .post("/bookings")
      .send({ slot_id: PAST_SLOT.id, name: "Ada", email: "ada@example.com" });
    expect(res.status).toBe(400);
  });

  it("trims name/email and lowercases email on success", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const res = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "  Ada Obi  ", email: "  ADA@Example.com  " })
      .expect(201);

    expect(res.body.name).toBe("Ada Obi");
    expect(res.body.email).toBe("ada@example.com");
    expect(res.body.status).toBe("confirmed");
  });

  it("409s when the slot already has a confirmed booking", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "First", email: "first@example.com" })
      .expect(201);

    const res = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Second", email: "second@example.com" });
    expect(res.status).toBe(409);
  });
});

describe("GET /bookings/:id and DELETE /bookings/:id", () => {
  it("404s for a booking id that doesn't exist", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const res = await authed().get("/bookings/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("cancels a booking, frees the slot, and rejects a second cancel", async () => {
    await resetWithSlots([FUTURE_SLOT]);
    const created = await authed()
      .post("/bookings")
      .send({ slot_id: "s1", name: "Ada", email: "ada@example.com" })
      .expect(201);

    const id = created.body.id;

    const cancelled = await authed().delete(`/bookings/${id}`).expect(200);
    expect(cancelled.body.status).toBe("cancelled");

    const slots = await authed().get("/slots").expect(200);
    expect(slots.body.slots[0].available).toBe(true);

    const secondCancel = await authed().delete(`/bookings/${id}`);
    expect(secondCancel.status).toBe(409);
  });
});
