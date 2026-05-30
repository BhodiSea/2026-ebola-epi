import "server-only";

import { africaCDCAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { AFRICA_CDC_FN_CONFIG, AFRICA_CDC_POLL_EVENT } from "./africa-cdc-config";

export const ingestAfricaCDC = inngest.createFunction(
  AFRICA_CDC_FN_CONFIG,
  [{ cron: africaCDCAdapter.pollInterval }, { event: AFRICA_CDC_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(africaCDCAdapter, step),
);
