import { buildIngestConfig, pollEventName } from "./ingest-source-config";

/** Manual-trigger event name — used in tests and in the Inngest dev dashboard. */
export const WHO_DON_POLL_EVENT = pollEventName("who-don");

// CEL string-literal throttle key: `"who.int"` — all ingest-who-don invocations
// (cron + manual) share this host bucket regardless of event payload content.
// Cron events have no event.data fields, so event-data refs evaluate to null;
// a static CEL literal is required for correct per-host throttle isolation.
// AGENTS.md rule 15: never use in-process p-throttle.
export const WHO_DON_FN_CONFIG = buildIngestConfig("who-don", "who.int");
