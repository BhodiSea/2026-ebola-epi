/**
 * Function config is extracted into its own module so unit tests can assert
 * on throttle/concurrency settings without importing the server-only Inngest
 * handler (which pulls in Drizzle, Anthropic, and `server-only` guards).
 */
export const WHO_DON_FN_CONFIG = {
  id: "ingest-who-don",
  retries: 4,
  concurrency: { limit: 1 },
  // Inngest server-side throttle — coordinates across all function instances.
  // key binds per source host so multi-source Phase 6 functions inherit this shape.
  // AGENTS.md hard rule 15: never use in-process p-throttle.
  throttle: { limit: 2, period: "1s", scope: "account", key: "event.data.host" },
} as const;
