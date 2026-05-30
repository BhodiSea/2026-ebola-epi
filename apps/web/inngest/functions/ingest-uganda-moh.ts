import "server-only";

import { ugandaMOHAdapter } from "@ituri/ingest";

import { inngest } from "../client";
import { runPerSourceIngest } from "../lib/ingest-runner";
import { UGANDA_MOH_FN_CONFIG, UGANDA_MOH_POLL_EVENT } from "./uganda-moh-config";

export const ingestUgandaMOH = inngest.createFunction(
  UGANDA_MOH_FN_CONFIG,
  [{ cron: ugandaMOHAdapter.pollInterval }, { event: UGANDA_MOH_POLL_EVENT }],
  async ({ step }) => runPerSourceIngest(ugandaMOHAdapter, step),
);
