import { listSlots } from "@/lib/backend";
import { SlotList } from "./slot-list";

export default async function Home() {
  const { slots } = await listSlots();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Book an appointment
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Choose an available slot below.
      </p>

      <SlotList slots={slots} />
    </main>
  );
}
