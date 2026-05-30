import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@ituri/evals",
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
});
