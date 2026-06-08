/**
 * Next.js instrumentation hook — loaded once per server process on start.
 * Each sink is a no-op when its env vars are absent (dev / CI / test).
 *
 * Execution order:
 *  1. Sentry.init — registers error monitoring and slow-transaction traces.
 *  2. registerOTel(LangfuseExporter) — wires Inngest step.ai.wrap spans to Langfuse.
 */
export async function register(): Promise<void> {
  // NEXT_RUNTIME is a framework internal — safe to read via process.env before env.ts loads.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // Dynamic import keeps env.ts validation (and required-var checks) out of the edge runtime.
  const { env } = await import("@/lib/env");

  if (env.SENTRY_DSN !== undefined) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  }

  if (env.LANGFUSE_PUBLIC_KEY !== undefined && env.LANGFUSE_SECRET_KEY !== undefined) {
    const { registerOTel } = await import("@vercel/otel");
    const { LangfuseExporter } = await import("langfuse-vercel");
    registerOTel({
      serviceName: "ituri-sitrep",
      // exactOptionalPropertyTypes: only spread baseUrl when defined to avoid string|undefined mismatch.
      traceExporter: new LangfuseExporter({
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        ...(env.LANGFUSE_BASE_URL === undefined ? {} : { baseUrl: env.LANGFUSE_BASE_URL }),
      }),
    });
  }
}
