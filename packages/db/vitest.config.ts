import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@ituri/db",
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@ituri/shared": fileURLToPath(new URL("../shared/src/ids.ts", import.meta.url)),
    },
  },
});
