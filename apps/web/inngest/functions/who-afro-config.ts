import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const WHO_AFRO_POLL_EVENT = pollEventName("who-afro");

export const WHO_AFRO_FN_CONFIG = buildIngestConfig("who-afro", "afro.who.int");
