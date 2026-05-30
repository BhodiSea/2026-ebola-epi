import { backFillExtraction } from "./back-fill";
import { extractDocument } from "./extract-document";
import { ingestWHODON } from "./ingest-who-don";
import { maintenanceAgent } from "./maintenance";
import { reconcileCounts } from "./reconcile-counts";
import { shadowExtraction } from "./shadow-extraction";
import { syntheticMonitor } from "./synthetic-monitor";
import { triageDocument } from "./triage-document";

export const functions = [
  ingestWHODON,
  triageDocument,
  extractDocument,
  reconcileCounts,
  syntheticMonitor,
  maintenanceAgent,
  backFillExtraction,
  shadowExtraction,
];
