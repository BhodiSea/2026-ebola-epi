import "server-only";

import { whoDONAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { WHO_DON_FN_CONFIG, WHO_DON_POLL_EVENT } from "./who-don-config";

export const ingestWHODON = inngest.createFunction(
  WHO_DON_FN_CONFIG,
  [{ cron: whoDONAdapter.pollInterval }, { event: WHO_DON_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(whoDONAdapter, step),
);
