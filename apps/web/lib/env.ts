import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Next.js-managed — set to "nodejs" or "edge" by the framework
    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_ENV: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().min(1),
    ARCJET_KEY: z.string().min(1).optional(),
    INNGEST_EVENT_KEY: z.string().min(1),
    INNGEST_SIGNING_KEY: z.string().min(1),
    // REST API key for querying run history — separate from signing key; issue from Inngest dashboard
    INNGEST_API_KEY: z.string().optional(),
    POSTGRES_URL_NON_POOLING: z.url(),
    // Phase 7 — cost kill-switch + notifications
    EDGE_CONFIG: z.string().optional(),
    SLACK_WEBHOOK_URL: z.url().optional(),
    // Phase 7 — escalation notifications
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM_NUMBER: z.string().optional(),
    TWILIO_TO_NUMBER: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_REPO: z.string().optional(),
    // Ingest adapter credentials (optional — adapters throw visibly when missing at runtime)
    RELIEFWEB_APPNAME: z.string().optional(),
    ACLED_ACCESS_TOKEN: z.string().optional(),
    ACLED_EMAIL: z.string().optional(),
    // Phase 7 — Langfuse / OTel
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.url().optional(),
    SENTRY_DSN: z.url().optional(),
    // Phase 7 — Upstash Redis rate limiting
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SITE_URL: z.url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ARCJET_KEY: process.env.ARCJET_KEY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
    INNGEST_API_KEY: process.env.INNGEST_API_KEY,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    EDGE_CONFIG: process.env.EDGE_CONFIG,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    TWILIO_TO_NUMBER: process.env.TWILIO_TO_NUMBER,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_REPO: process.env.GITHUB_REPO,
    RELIEFWEB_APPNAME: process.env.RELIEFWEB_APPNAME,
    ACLED_ACCESS_TOKEN: process.env.ACLED_ACCESS_TOKEN,
    ACLED_EMAIL: process.env.ACLED_EMAIL,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  emptyStringAsUndefined: true,
});

export const hasEnvVars =
  env.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined;

export function siteUrl(): string {
  return env.NEXT_PUBLIC_SITE_URL;
}
