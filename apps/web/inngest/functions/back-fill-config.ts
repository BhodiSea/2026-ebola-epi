// Non-server-only: importable by config unit tests without pulling in Drizzle/Anthropic/server-only.

import { DOCUMENT_BACKFILL_REQUESTED } from "./pipeline-events-config";

export const BACK_FILL_FN_CONFIG = {
  id: "back-fill-extraction",
  retries: 1,
  concurrency: { limit: 1 },
} as const;

export const BACK_FILL_TRIGGER = { event: DOCUMENT_BACKFILL_REQUESTED } as const;
