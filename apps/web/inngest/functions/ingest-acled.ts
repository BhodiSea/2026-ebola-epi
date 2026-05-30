import "server-only";

import { acledAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { ACLED_FN_CONFIG, ACLED_POLL_EVENT } from "./acled-config";

export const ingestACLED = inngest.createFunction(
  ACLED_FN_CONFIG,
  [{ cron: acledAdapter.pollInterval }, { event: ACLED_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(acledAdapter, step),
);
