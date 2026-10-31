/**
 * Express app assembly. Deliberately separate from server.ts: this file
 * exports the configured `app` without ever calling `.listen()`, so
 * integration tests can `import { app }` and drive it with a test HTTP
 * client (e.g. supertest) without binding a real port.
 *
 * Middleware order matters — a misplaced middleware silently doesn't
 * apply to the requests you'd expect. Security headers, CORS, and
 * request logging are intentionally omitted here: this API is called
 * server-to-server (no browser origin to worry about) and has no
 * logging infrastructure to write to, so adding helmet/cors/a logger
 * would be unused weight rather than a missing safeguard.
 */
import express from "express";
import { requireApiKey } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { bookingsRouter } from "./routes/bookings.routes";
import { resetRouter } from "./routes/reset.routes";
import { slotsRouter } from "./routes/slots.routes";

export const app = express();

// Body parsing must run before anything that reads req.body, including
// the auth/validation middleware on individual routes.
app.use(express.json());

// Every route requires the API key, so this runs ahead of routing
// rather than being repeated per-router.
app.use(requireApiKey);

// Each router owns its own route-specific middleware (validation, rate
// limiting) — see routes/bookings.routes.ts.
app.use("/reset", resetRouter);
app.use("/slots", slotsRouter);
app.use("/bookings", bookingsRouter);

// Catch-all for unmatched routes.
app.use(notFoundHandler);

// Error handler — must be registered last; Express identifies it by
// its 4-argument signature (see middleware/error-handler.ts).
app.use(errorHandler);
