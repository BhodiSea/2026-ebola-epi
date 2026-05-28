/**
 * Next.js instrumentation hook — loaded once per server process.
 * OTel providers (Sentry, Axiom, Langfuse) are wired in Phase 7.
 * Until then this is a deliberate noop so step.ai.wrap has a trace context to inherit.
 */
export async function register(): Promise<void> {
  // Phase 7: initialise OTel SDK based on SENTRY_DSN / AXIOM_TOKEN / LANGFUSE_PUBLIC_KEY.
}
