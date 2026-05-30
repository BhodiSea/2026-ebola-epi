import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const ECDC_CDTR_POLL_EVENT = pollEventName("ecdc-cdtr");

export const ECDC_CDTR_FN_CONFIG = buildIngestConfig("ecdc-cdtr", "www.ecdc.europa.eu");
