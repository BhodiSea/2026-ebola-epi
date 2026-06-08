import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "PORT=3001 pnpm dev",
    url: "http://localhost:3001",
    reuseExistingServer: process.env.CI !== "true",
    timeout: 120_000,
    // Override to local Supabase stack so e2e tests hit seeded data.
    // These are the standard local-dev demo credentials (not production secrets).
    /* eslint-disable no-secrets/no-secrets */
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      POSTGRES_URL_NON_POOLING: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
    },
    /* eslint-enable no-secrets/no-secrets */
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
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
