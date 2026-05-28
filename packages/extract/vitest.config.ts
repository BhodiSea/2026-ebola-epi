import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@ituri/extract",
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
