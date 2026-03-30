import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/cli/cleanup-cross-os.test.ts"],
    pool: "threads",
    testTimeout: 15000,
    hookTimeout: 10000,
    // Intentionally avoid project-wide global setup/teardown for these unit tests.
    setupFiles: [],
  },
});
