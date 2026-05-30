// Non-server-only: importable by config unit tests without pulling in Drizzle/server-only.

import { SHADOW_RUN_TRIGGER } from "./pipeline-events-config";

export const SHADOW_EXTRACTION_FN_CONFIG = {
  id: "shadow-extraction",
  retries: 1,
} as const;

export const SHADOW_EXTRACTION_TRIGGER = { event: SHADOW_RUN_TRIGGER } as const;
