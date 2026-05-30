import "server-only";

import { reliefwebAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { RELIEFWEB_FN_CONFIG, RELIEFWEB_POLL_EVENT } from "./reliefweb-config";

export const ingestReliefWeb = inngest.createFunction(
  RELIEFWEB_FN_CONFIG,
  [{ cron: reliefwebAdapter.pollInterval }, { event: RELIEFWEB_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(reliefwebAdapter, step),
);
