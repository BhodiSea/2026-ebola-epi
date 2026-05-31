// @vitest-environment node
// P5: waitForEvent("escalation.confirmed") was removed from triage-document and moved
// to await-escalation.ts. Triage now emits ESCALATION_NOVEL_PATHOGEN_COUNTRY and returns
// immediately; the dedicated await-escalation function holds the 7-day wait in its own
// concurrency slot, freeing triage-document's limit=5 slots for new documents.
import { describe, expect, it } from "vitest";

import { DOCUMENT_TRIAGE_REQUESTED } from "../pipeline-events-config.js";
import { TRIAGE_DOCUMENT_FN_CONFIG, TRIAGE_DOCUMENT_TRIGGER } from "../pipeline-fn-config.js";

describe("triageDocument function config", () => {
  it("id is triage-document", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.id).toBe("triage-document");
  });

  it("concurrency.limit is 5 (no longer occupied by 7-day escalation waits)", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.concurrency.limit).toBe(5);
  });

  it("retries is 3", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.retries).toBe(3);
  });

  it("trigger event is DOCUMENT_TRIAGE_REQUESTED", () => {
    expect(TRIAGE_DOCUMENT_TRIGGER.event).toBe(DOCUMENT_TRIAGE_REQUESTED);
  });
});
