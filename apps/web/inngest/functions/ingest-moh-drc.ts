import "server-only";

import { mohDRCAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { MOH_DRC_FN_CONFIG, MOH_DRC_POLL_EVENT } from "./moh-drc-config";

export const ingestMOHDRC = inngest.createFunction(
  MOH_DRC_FN_CONFIG,
  [{ cron: mohDRCAdapter.pollInterval }, { event: MOH_DRC_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(mohDRCAdapter, step),
);
