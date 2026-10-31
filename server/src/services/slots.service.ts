import { store } from "../lib/store";
import type { Slot, SlotWithAvailability } from "../types";
import type { ResetInput } from "../validation/reset.schema";

export async function resetData(input: ResetInput): Promise<void> {
  await store.resetWith(input.slots as Slot[]);
}

export async function listSlots(
  providerFilter?: string,
): Promise<SlotWithAvailability[]> {
  const [slots, activeSlotIds] = await Promise.all([
    store.listSlots(providerFilter),
    store.listActiveSlotIds(),
  ]);

  return slots.map((slot) => ({
    ...slot,
    available: !activeSlotIds.has(slot.id),
  }));
}
