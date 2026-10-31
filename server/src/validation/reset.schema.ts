import { z } from "zod";

export const slotSchema = z.object({
  id: z.string().trim().min(1),
  provider: z.string().trim().min(1),
  // We validate these are non-empty strings here; the service layer
  // parses them as dates when it needs to compare against "now" (see
  // slots.service.ts) rather than coercing to Date at the schema level,
  // since these are stored and returned as plain ISO strings.
  start: z.string().trim().min(1),
  end: z.string().trim().min(1),
});

export const resetSchema = z.object({
  slots: z.array(slotSchema),
});

export type ResetInput = z.infer<typeof resetSchema>;
