import request from "supertest";
import { app } from "../src/app";

export const API_KEY = process.env.API_KEY as string;

/** A supertest agent pre-configured with the valid API key header. */
export function authed() {
  return {
    get: (path: string) => request(app).get(path).set("X-API-Key", API_KEY),
    post: (path: string) => request(app).post(path).set("X-API-Key", API_KEY),
    delete: (path: string) =>
      request(app).delete(path).set("X-API-Key", API_KEY),
  };
}

/** Resets all slots/bookings to a known fixture before a test runs. */
export async function resetWithSlots(
  slots: Array<{ id: string; provider: string; start: string; end: string }>,
) {
  await authed().post("/reset").send({ slots }).expect(200);
}

export const FUTURE_SLOT = {
  id: "s1",
  provider: "Dr Ade",
  start: "2026-12-10T09:00:00Z",
  end: "2026-12-10T09:30:00Z",
};

export const PAST_SLOT = {
  id: "s-past",
  provider: "Dr Bello",
  start: "2000-01-01T09:00:00Z",
  end: "2000-01-01T09:30:00Z",
};
