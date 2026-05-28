import "server-only";

import { agentActions } from "@ituri/db";

import { inngest } from "../client";
import { SYNTHETIC_MONITOR_EVENT, SYNTHETIC_MONITOR_FN_CONFIG } from "./synthetic-monitor-config";
import { db } from "@/lib/db";

export const syntheticMonitor = inngest.createFunction(
  SYNTHETIC_MONITOR_FN_CONFIG,
  { event: SYNTHETIC_MONITOR_EVENT },
  async () => {
    await db.insert(agentActions).values({
      agent: "synthetic-monitor",
      action: "ping",
      payload: { phase: 2, note: "skeleton; full fixture replay lands Phase 7" },
    });
  },
);
