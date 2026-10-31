/**
 * Process entry point: binds the port and handles graceful shutdown.
 * All app wiring lives in app.ts — this file's only job is "run it."
 */
import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console -- startup banner, not app logging
  console.log(`Clinic booking API listening on port ${env.PORT}`);
});

function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
