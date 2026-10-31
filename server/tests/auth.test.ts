import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { API_KEY } from "./helpers";

describe("API key authentication", () => {
  it("401s when the header is missing entirely", async () => {
    const res = await request(app).get("/slots");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("401s when the key is wrong", async () => {
    const res = await request(app)
      .get("/slots")
      .set("X-API-Key", "definitely-not-the-key");
    expect(res.status).toBe(401);
  });

  it("200s when the key is correct", async () => {
    const res = await request(app).get("/slots").set("X-API-Key", API_KEY);
    expect(res.status).toBe(200);
  });

  it("applies to every route, not just one", async () => {
    const resReset = await request(app).post("/reset").send({ slots: [] });
    const resBookings = await request(app).get(
      "/bookings?email=a@example.com",
    );
    expect(resReset.status).toBe(401);
    expect(resBookings.status).toBe(401);
  });
});
