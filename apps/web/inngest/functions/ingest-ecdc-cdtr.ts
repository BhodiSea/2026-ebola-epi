import "server-only";

import { ecdcCDTRAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { ECDC_CDTR_FN_CONFIG, ECDC_CDTR_POLL_EVENT } from "./ecdc-cdtr-config";

export const ingestECDCCDTR = inngest.createFunction(
  ECDC_CDTR_FN_CONFIG,
  [{ cron: ecdcCDTRAdapter.pollInterval }, { event: ECDC_CDTR_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(ecdcCDTRAdapter, step),
);
