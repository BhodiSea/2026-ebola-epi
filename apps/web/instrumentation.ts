/**
 * Next.js instrumentation hook — loaded once per server process on start.
 * Each sink is a no-op when its env vars are absent (dev / CI / test).
 *
 * Execution order:
 *  1. Sentry.init — registers error monitoring and slow-transaction traces.
 *  2. registerOTel(LangfuseExporter) — wires Inngest step.ai.wrap spans to Langfuse.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.SENTRY_DSN !== undefined) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
    });
  }

  if (
    process.env.LANGFUSE_PUBLIC_KEY !== undefined &&
    process.env.LANGFUSE_SECRET_KEY !== undefined
  ) {
    const { registerOTel } = await import("@vercel/otel");
    const { LangfuseExporter } = await import("langfuse-vercel");
    registerOTel({
      serviceName: "ituri-sitrep",
      // exactOptionalPropertyTypes: only spread baseUrl when defined to avoid string|undefined mismatch.
      traceExporter: new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        ...(process.env.LANGFUSE_BASE_URL === undefined
          ? {}
          : { baseUrl: process.env.LANGFUSE_BASE_URL }),
      }),
    });
  }
}
