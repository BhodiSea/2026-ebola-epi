import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const ACLED_POLL_EVENT = pollEventName("acled");

export const ACLED_FN_CONFIG = buildIngestConfig("acled", "api.acleddata.com");
