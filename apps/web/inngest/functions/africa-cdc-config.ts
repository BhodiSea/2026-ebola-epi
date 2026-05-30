import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const AFRICA_CDC_POLL_EVENT = pollEventName("africa-cdc");

export const AFRICA_CDC_FN_CONFIG = buildIngestConfig("africa-cdc", "africacdc.org");
