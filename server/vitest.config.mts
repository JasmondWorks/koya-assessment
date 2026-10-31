import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    // The rate limiter keeps its per-email counters in a module-level
    // Map, not per-request. Running test files in parallel workers
    // would each get their own copy of that state, which sounds safe
    // but isn't what we want to verify — the whole point of several
    // tests here is to exercise ONE shared process the way it actually
    // runs in production. Single-threaded, sequential test files keep
    // that true.
    fileParallelism: false,
    // Tests hit a real network database now, not an in-process Map —
    // several tests make 5-25+ round trips in sequence/parallel, which
    // comfortably exceeds Vitest's 5s default under real network
    // latency even though nothing is actually slow or stuck.
    testTimeout: 30_000,
  },
});
