import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@ituri/ingest",
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
