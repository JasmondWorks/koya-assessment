/**
 * Populates slots on a running instance of this API by calling its own
 * POST /reset endpoint — not a database script, a client of the API
 * itself. /reset is the only way slots enter the system (there's no
 * incremental "add a slot" endpoint), and it wipes everything else
 * every time it's called, so this is meant to be run deliberately
 * before a demo/test session, never as part of normal app traffic.
 *
 * Usage:
 *   API_URL=http://localhost:3000 API_KEY=... npx tsx scripts/seed.ts
 */
const API_URL = process.env.API_URL ?? "http://localhost:3000";
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Set API_KEY to the target instance's API key and re-run.");
  process.exit(1);
}

function daysFromNow(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

const providers = ["Dr Ade", "Dr Bello", "Dr Chukwu"];
const slots = providers.flatMap((provider, providerIndex) =>
  [1, 2, 3].map((dayOffset, i) => {
    const hour = 9 + i * 2;
    return {
      id: `${provider.toLowerCase().replace(/\s+/g, "-")}-${dayOffset}-${hour}`,
      provider,
      start: daysFromNow(dayOffset + providerIndex, hour),
      end: daysFromNow(dayOffset + providerIndex, hour + 1),
    };
  }),
);

async function main() {
  const res = await fetch(`${API_URL}/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY as string,
    },
    body: JSON.stringify({ slots }),
  });

  if (!res.ok) {
    console.error(`Seed failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  console.log(`Seeded ${slots.length} slots at ${API_URL}`);
}

main();
