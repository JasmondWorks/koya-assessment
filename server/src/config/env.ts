/**
 * Environment configuration — validated once, at process start.
 *
 * Why this exists instead of reading `process.env.X` wherever it's needed:
 * an env var that's missing or malformed should fail LOUDLY the moment the
 * process boots, with a message that says exactly what's wrong — not
 * surface three hours later as a confusing `undefined` deep inside a
 * request handler. This module is the single place that touches
 * `process.env`; everything else imports the validated `env` object below.
 */
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // z.coerce because process.env values are always strings — "3000" must
  // become the number 3000 before we hand it to `app.listen`.
  PORT: z.coerce.number().int().positive().default(3000),

  // The API key is a secret the operator chooses. We only require that
  // it exists and isn't trivially short — we never log or echo it back.
  API_KEY: z.string().min(8, "API_KEY must be at least 8 characters"),

  // Postgres connection string (Neon in production). Required — there's
  // no in-memory fallback, because the whole point of this variable is
  // the task's own requirement that bookings survive a restart/redeploy.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Flatten zod's nested issue format into something a human can act on
  // immediately, then exit — there is no safe way to keep booting with
  // invalid configuration.
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  // eslint-disable-next-line no-console -- this is the one place a raw
  // console is correct: the structured logger doesn't exist yet at boot.
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
