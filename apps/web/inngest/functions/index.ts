import { extractDocument } from "./extract-document";
import { ingestWHODON } from "./ingest-who-don";
import { reconcileCounts } from "./reconcile-counts";
import { syntheticMonitor } from "./synthetic-monitor";
import { triageDocument } from "./triage-document";

export const functions = [
  ingestWHODON,
  triageDocument,
  extractDocument,
  reconcileCounts,
  syntheticMonitor,
];
