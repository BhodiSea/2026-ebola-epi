import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const RELIEFWEB_POLL_EVENT = pollEventName("reliefweb");

export const RELIEFWEB_FN_CONFIG = buildIngestConfig("reliefweb", "api.reliefweb.int");
