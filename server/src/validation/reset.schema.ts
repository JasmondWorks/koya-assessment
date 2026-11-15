import { z } from "zod";

export const slotSchema = z
  .object({
    id: z.string().trim().min(1),
    provider: z.string().trim().min(1),
    // ISO 8601 date-time strings, validated as real dates here — not
    // just non-empty strings — so a malformed value is rejected with a
    // clean 400 at the boundary instead of becoming an Invalid Date
    // that silently breaks the "has this slot started" comparison in
    // bookings.service.ts or fails oddly when written to Postgres.
    start: z.string().trim().min(1).pipe(z.iso.datetime({ offset: true })),
    end: z.string().trim().min(1).pipe(z.iso.datetime({ offset: true })),
  })
  .refine((slot) => new Date(slot.end).getTime() > new Date(slot.start).getTime(), {
    message: "end must be after start",
    path: ["end"],
  });

export const resetSchema = z.object({
  slots: z.array(slotSchema),
});

export type ResetInput = z.infer<typeof resetSchema>;
