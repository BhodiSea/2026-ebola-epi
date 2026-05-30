import { backFillExtraction } from "./back-fill";
import { extractDocument } from "./extract-document";
import { ingestACLED } from "./ingest-acled";
import { ingestAfricaCDC } from "./ingest-africa-cdc";
import { ingestECDCCDTR } from "./ingest-ecdc-cdtr";
import { ingestMOHDRC } from "./ingest-moh-drc";
import { ingestReliefWeb } from "./ingest-reliefweb";
import { ingestUgandaMOH } from "./ingest-uganda-moh";
import { ingestWHOAFRO } from "./ingest-who-afro";
import { ingestWHODON } from "./ingest-who-don";
import { maintenanceAgent } from "./maintenance";
import { reconcileCounts } from "./reconcile-counts";
import { shadowExtraction } from "./shadow-extraction";
import { syntheticMonitor } from "./synthetic-monitor";
import { triageDocument } from "./triage-document";

export const functions = [
  ingestWHODON,
  ingestWHOAFRO,
  ingestECDCCDTR,
  ingestAfricaCDC,
  ingestReliefWeb,
  ingestACLED,
  ingestMOHDRC,
  ingestUgandaMOH,
  triageDocument,
  extractDocument,
  reconcileCounts,
  syntheticMonitor,
  maintenanceAgent,
  backFillExtraction,
  shadowExtraction,
];
