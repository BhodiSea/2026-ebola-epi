import "server-only";

import { whoAFROAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { WHO_AFRO_FN_CONFIG, WHO_AFRO_POLL_EVENT } from "./who-afro-config";

export const ingestWHOAFRO = inngest.createFunction(
  WHO_AFRO_FN_CONFIG,
  [{ cron: whoAFROAdapter.pollInterval }, { event: WHO_AFRO_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(whoAFROAdapter, step),
);
