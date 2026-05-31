import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.CI !== "true",
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /internal-.*\.spec\.ts/,
    },
    {
      name: "chromium-admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.auth/admin.json",
      },
      testMatch: /internal-.*\.spec\.ts/,
    },
    {
      name: "Pixel 5",
      use: { ...devices["Pixel 5"] },
      testIgnore: /internal-.*\.spec\.ts/,
    },
  ],
});
