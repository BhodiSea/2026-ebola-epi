import "@testing-library/jest-dom/vitest";

// env.ts uses @t3-oss/env-nextjs createEnv() which validates at import time.
// Provide dummy values for vars that aren't Supabase-related so the module
// loads without throwing. Real Supabase vars are written by globalSetup.
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test-integration";
process.env.INNGEST_EVENT_KEY ??= "test-integration";
process.env.INNGEST_SIGNING_KEY ??= "signkey-test-integration";
