/**
 * Single shared Prisma client for the process. Prisma's own guidance is
 * to instantiate one client and reuse it — each `new PrismaClient()`
 * opens its own connection pool, and creating one per request would
 * exhaust Postgres's connection limit almost immediately under load.
 */
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
