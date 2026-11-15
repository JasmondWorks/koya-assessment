import { listSlots } from "@/lib/backend";

// Slot availability changes on every booking — this page must never be
// served from a prerendered cache. Next 16's Cache Components model
// requires this to be explicit rather than inferred from the fetch call.
export const instant = false;
import { SlotList } from "./slot-list";
import { BookingLookup } from "./booking-lookup";
import { MyBookings } from "./my-bookings";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function Home() {
  const { slots } = await listSlots();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Clinic booking</h1>
      <p className="mt-2 text-muted-foreground">
        See available slots, book one, or manage an existing booking.
      </p>

      <Tabs defaultValue="book" className="mt-8">
        <TabsList>
          <TabsTrigger value="book">Book a slot</TabsTrigger>
          <TabsTrigger value="lookup">Look up a booking</TabsTrigger>
          <TabsTrigger value="mine">My bookings</TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="mt-6">
          <SlotList slots={slots} />
        </TabsContent>

        <TabsContent value="lookup" className="mt-6">
          <BookingLookup />
        </TabsContent>

        <TabsContent value="mine" className="mt-6">
          <MyBookings />
        </TabsContent>
      </Tabs>
    </main>
  );
}
