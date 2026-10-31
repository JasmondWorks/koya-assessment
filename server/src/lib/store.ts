/**
 * Postgres-backed data access. Every bit of state here used to live in
 * module-scope in-memory Maps — this file is the direct replacement,
 * same call sites and shapes, now backed by the database so bookings
 * survive a process restart/redeploy and stay correct across more than
 * one running instance.
 *
 * ---
 * HOW THIS GUARANTEES SAFE CONCURRENT BOOKING
 * ---
 * The in-memory version relied on Node being single-threaded: a
 * synchronous check-then-set couldn't be interrupted mid-way, so two
 * "simultaneous" requests were actually always processed one after the
 * other. That guarantee doesn't survive moving to a real database or
 * running more than one app instance — there IS a gap now, between
 * checking "is this slot free" and writing "I'm claiming it," where a
 * second request's query can land.
 *
 * The fix is to not rely on checking first at all. `tryClaimSlot` below
 * does a single INSERT into `ActiveBooking`, whose primary key is
 * `slotId` — there can only ever be one row per slot. If the slot is
 * already taken, the INSERT itself fails with Postgres's unique-
 * constraint violation (Prisma surfaces this as error code `P2002`).
 * That failure IS the "slot already booked" signal — there's no
 * separate read-then-decide step for a second request to race into.
 * Postgres's own row-level locking during the INSERT is what makes this
 * atomic, not anything in our application code.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Booking, Slot } from "../types";

interface IdempotencyRecord {
  bodyFingerprint: string;
  statusCode: number;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
}

function toBooking(row: {
  id: string;
  slotId: string;
  name: string;
  email: string;
  status: string;
  createdAt: Date;
}): Booking {
  return {
    id: row.id,
    slot_id: row.slotId,
    name: row.name,
    email: row.email,
    status: row.status as Booking["status"],
    created_at: row.createdAt.toISOString(),
  };
}

function toSlot(row: {
  id: string;
  provider: string;
  start: Date;
  end: Date;
}): Slot {
  return {
    id: row.id,
    provider: row.provider,
    start: row.start.toISOString(),
    end: row.end.toISOString(),
  };
}

/** Replaces every slot and wipes all bookings. */
async function resetWith(slots: Slot[]): Promise<void> {
  await prisma.$transaction([
    prisma.activeBooking.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.idempotencyRecord.deleteMany(),
    prisma.slot.deleteMany(),
    prisma.slot.createMany({
      data: slots.map((slot) => ({
        id: slot.id,
        provider: slot.provider,
        start: new Date(slot.start),
        end: new Date(slot.end),
      })),
    }),
  ]);
}

async function getSlot(id: string): Promise<Slot | undefined> {
  const row = await prisma.slot.findUnique({ where: { id } });
  return row ? toSlot(row) : undefined;
}

async function listSlots(providerFilter?: string): Promise<Slot[]> {
  const rows = await prisma.slot.findMany({
    where: providerFilter ? { provider: providerFilter } : undefined,
    orderBy: { start: "asc" },
  });
  return rows.map(toSlot);
}

/**
 * All slot ids that currently have an active (confirmed) booking, as a
 * single query. Used when listing many slots at once, so availability
 * for the whole page is one round trip instead of one query per slot.
 */
async function listActiveSlotIds(): Promise<Set<string>> {
  const rows = await prisma.activeBooking.findMany({
    select: { slotId: true },
  });
  return new Set(rows.map((row) => row.slotId));
}

/**
 * Creates the booking and claims the slot as a single atomic step. See
 * the module-level comment: the uniqueness of `ActiveBooking.slotId` is
 * what makes this safe under real concurrency, not any check we do
 * beforehand. Returns the booking on success, or `null` if the slot
 * was already claimed — callers turn that into a 409.
 */
async function tryCreateBooking(
  slotId: string,
  name: string,
  email: string,
): Promise<Booking | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: { slotId, name, email, status: "confirmed" },
      });
      // If a concurrent transaction already inserted this slotId, THIS
      // line is where that shows up — as a thrown P2002, not as a
      // value we could have checked for first.
      await tx.activeBooking.create({
        data: { slotId, bookingId: booking.id },
      });
      return toBooking(booking);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }
    throw error;
  }
}

async function getBooking(id: string): Promise<Booking | undefined> {
  const row = await prisma.booking.findUnique({ where: { id } });
  return row ? toBooking(row) : undefined;
}

/** Oldest-first page of one person's bookings, keyed by insertion-order `seq`. */
async function listBookingsByEmailPage(
  normalizedEmail: string,
  limit: number,
  cursor: string | undefined,
): Promise<{ bookings: Booking[]; nextCursor: string | null }> {
  let cursorSeq: number | undefined;
  if (cursor) {
    const cursorRow = await prisma.booking.findUnique({
      where: { id: cursor },
      select: { seq: true },
    });
    // An unrecognized cursor (cursorRow is undefined) falls through to
    // cursorSeq staying undefined, which the query below treats as "no
    // cursor" — i.e. start from the first page. There's no single right
    // answer for a stale/invalid cursor, so this picks the forgiving
    // behavior (restart) over returning an error for it.
    cursorSeq = cursorRow?.seq;
  }

  // Fetch one extra row to know whether a next page exists without a
  // second query.
  const rows = await prisma.booking.findMany({
    where: {
      email: normalizedEmail,
      ...(cursorSeq !== undefined ? { seq: { gt: cursorSeq } } : {}),
    },
    orderBy: { seq: "asc" },
    take: limit + 1,
  });

  const page = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const lastItem = page[page.length - 1];

  return {
    bookings: page.map(toBooking),
    nextCursor: hasMore && lastItem ? lastItem.id : null,
  };
}

/**
 * Cancels a booking and frees its slot in one transaction — both
 * writes need to land together, or a reader could see a cancelled
 * booking whose slot still looks taken (or the reverse).
 */
async function cancelBooking(booking: Booking): Promise<Booking> {
  const [updated] = await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "cancelled" },
    }),
    prisma.activeBooking.deleteMany({ where: { slotId: booking.slot_id } }),
  ]);
  return toBooking(updated);
}

async function getIdempotencyRecord(
  key: string,
): Promise<IdempotencyRecord | undefined> {
  const row = await prisma.idempotencyRecord.findUnique({ where: { key } });
  if (!row) return undefined;
  return {
    bodyFingerprint: row.bodyFingerprint,
    statusCode: row.statusCode,
    responseBody: row.responseBody,
    responseHeaders: row.responseHeaders as Record<string, string>,
  };
}

async function saveIdempotencyRecord(
  key: string,
  record: IdempotencyRecord,
): Promise<void> {
  await prisma.idempotencyRecord.upsert({
    where: { key },
    create: {
      key,
      bodyFingerprint: record.bodyFingerprint,
      statusCode: record.statusCode,
      responseBody: record.responseBody as Prisma.InputJsonValue,
      responseHeaders: record.responseHeaders as Prisma.InputJsonValue,
    },
    // A second write for the same key only happens if two requests with
    // a brand-new key raced each other — update is harmless here
    // because both would be caching the same first-attempt outcome in
    // practice (the booking-creation step itself is what's race-safe;
    // this cache write is a convenience, not the correctness boundary).
    update: {
      bodyFingerprint: record.bodyFingerprint,
      statusCode: record.statusCode,
      responseBody: record.responseBody as Prisma.InputJsonValue,
      responseHeaders: record.responseHeaders as Prisma.InputJsonValue,
    },
  });
}

export const store = {
  resetWith,
  getSlot,
  listSlots,
  listActiveSlotIds,
  tryCreateBooking,
  getBooking,
  listBookingsByEmailPage,
  cancelBooking,
  getIdempotencyRecord,
  saveIdempotencyRecord,
};
