import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Hardcode local Supabase stack credentials so they override .env.local (remote URL)
// inside worker processes. These are the well-known Supabase local-dev demo JWTs —
// identical to the values in supabase/config.toml and published at supabase.com/docs.
// They have no access to any real project. test.env is injected AFTER .env.local loads
// in workers, so this is the only way to guarantee local-stack credentials win.
/* eslint-disable no-secrets/no-secrets */
const LOCAL_SUPABASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  SUPABASE_SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  POSTGRES_URL_NON_POOLING: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  ANTHROPIC_API_KEY: "sk-ant-test-integration",
  INNGEST_EVENT_KEY: "test-integration",
  INNGEST_SIGNING_KEY: "signkey-test-integration",
};
/* eslint-enable no-secrets/no-secrets */

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    name: "@ituri/web-integration",
    // Inject local-stack credentials at the highest priority so .env.local (remote URL)
    // cannot shadow them in the worker processes.
    env: LOCAL_SUPABASE_ENV,
    // Query tests use `node` (no window → @t3-oss/env-nextjs allows server vars).
    // Page tests override to `jsdom` via environmentMatchGlobs below.
    environment: "node",
    environmentMatchGlobs: [["app/**/__tests__/integration/**/*.test.tsx", "jsdom"]],
    globals: true,
    include: [
      "lib/queries/__tests__/integration/**/*.test.ts",
      "app/**/__tests__/integration/**/*.test.tsx",
    ],
    globalSetup: "./vitest.integration.globalSetup.ts",
    setupFiles: ["./vitest.integration.setup.ts"],
    testTimeout: 30_000,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
