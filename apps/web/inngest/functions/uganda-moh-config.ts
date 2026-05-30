import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const UGANDA_MOH_POLL_EVENT = pollEventName("uganda-moh");

export const UGANDA_MOH_FN_CONFIG = buildIngestConfig("uganda-moh", "health.go.ug");
