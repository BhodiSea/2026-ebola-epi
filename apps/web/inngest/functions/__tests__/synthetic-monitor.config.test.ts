// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_MONITOR_EVENT,
  SYNTHETIC_MONITOR_FN_CONFIG,
} from "../synthetic-monitor-config.js";

describe("syntheticMonitor function config", () => {
  it("id is synthetic-monitor", () => {
    expect(SYNTHETIC_MONITOR_FN_CONFIG.id).toBe("synthetic-monitor");
  });

  it("retries is 0 (phase-2 skeleton — no retry on synthetic ping)", () => {
    expect(SYNTHETIC_MONITOR_FN_CONFIG.retries).toBe(0);
  });

  it("SYNTHETIC_MONITOR_EVENT matches the pg_cron POST payload", () => {
    expect(SYNTHETIC_MONITOR_EVENT).toBe("synthetic.check");
  });
});
