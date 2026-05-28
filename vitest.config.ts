import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/web/vitest.config.ts",
      "packages/db/vitest.config.ts",
      "packages/extract/vitest.config.ts",
      "packages/ingest/vitest.config.ts",
      "packages/shared/vitest.config.ts",
    ],
  },
});
