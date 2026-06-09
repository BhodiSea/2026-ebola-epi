// @vitest-environment node
// Verifies that await-escalation uses keyed concurrency so triage-document is not starved.
// Starvation scenario: triage-document.concurrency.limit = 5; if waitForEvent lived there,
// 5 simultaneous novel-pair escalations would hold all slots for up to 7 days.
// P5 fix: waitForEvent moved here; each matchKey gets its own slot, global cap = plan limit (100).
import { describe, expect, it } from "vitest";

import { ESCALATION_NOVEL_PATHOGEN_COUNTRY } from "../pipeline-events-config.js";
import { AWAIT_ESCALATION_FN_CONFIG, AWAIT_ESCALATION_TRIGGER } from "../pipeline-fn-config.js";

describe("awaitEscalation function config — identity", () => {
  it("id is await-escalation", () => {
    expect(AWAIT_ESCALATION_FN_CONFIG.id).toBe("await-escalation");
  });

  it("retries is 0 (timeout = skipped, not an error)", () => {
    expect(AWAIT_ESCALATION_FN_CONFIG.retries).toBe(0);
  });
});

describe("awaitEscalation function config — concurrency", () => {
  it("concurrency is an array (keyed + global)", () => {
    expect(Array.isArray(AWAIT_ESCALATION_FN_CONFIG.concurrency)).toBe(true);
  });

  it("first concurrency entry is keyed to event.data.matchKey (one slot per pair)", () => {
    const keyed = AWAIT_ESCALATION_FN_CONFIG.concurrency[0];
    expect(keyed.limit).toBe(1);
    expect(keyed.key).toBe("event.data.matchKey");
  });

  it("second concurrency entry is the global cap (high to avoid starving other matchKeys)", () => {
    const global = AWAIT_ESCALATION_FN_CONFIG.concurrency[1];
    expect(global.limit).toBeGreaterThanOrEqual(100);
    expect("key" in global).toBe(false);
  });
});

describe("awaitEscalation function config — trigger", () => {
  it("trigger event is ESCALATION_NOVEL_PATHOGEN_COUNTRY", () => {
    expect(AWAIT_ESCALATION_TRIGGER.event).toBe(ESCALATION_NOVEL_PATHOGEN_COUNTRY);
  });
});
