import { buildIngestConfig, pollEventName } from "./ingest-source-config";

export const MOH_DRC_POLL_EVENT = pollEventName("moh-drc");

export const MOH_DRC_FN_CONFIG = buildIngestConfig("moh-drc", "sante.gouv.cd");
