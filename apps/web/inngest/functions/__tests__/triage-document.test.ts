// @vitest-environment node
// P5: waitForEvent("escalation.confirmed") was removed from triage-document and moved
// to await-escalation.ts. Triage now emits ESCALATION_NOVEL_PATHOGEN_COUNTRY and returns
// immediately; the dedicated await-escalation function holds the 7-day wait in its own
// concurrency slot, freeing triage-document's limit=5 slots for new documents.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DOCUMENT_TRIAGE_REQUESTED } from "../pipeline-events-config.js";
import { TRIAGE_DOCUMENT_FN_CONFIG, TRIAGE_DOCUMENT_TRIGGER } from "../pipeline-fn-config.js";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ env: { ANTHROPIC_API_KEY: "test-key" } }));
vi.mock("@slack/webhook", () => ({ IncomingWebhook: vi.fn(() => ({ send: vi.fn() })) }));

const { mockInsert, mockInsertValues } = vi.hoisted(() => {
  const insertValuesFn = vi.fn().mockResolvedValue([]);
  const insertFn = vi.fn().mockReturnValue({ values: insertValuesFn });
  return { mockInsert: insertFn, mockInsertValues: insertValuesFn };
});
vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, select: vi.fn() } }));
vi.mock("@ituri/db", () => ({ agentActions: { name: "agent_actions" } }));

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

// --- recordNotOutbreakSkip ---------------------------------------------------

describe("recordNotOutbreakSkip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts an agent_actions row with action skipped_not_outbreak", async () => {
    const { recordNotOutbreakSkip } = await import("../triage-document.js");
    await recordNotOutbreakSkip("doc-uuid-001", "who-don");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ action: "skipped_not_outbreak" }),
    );
  });

  it("includes documentId and sourceSlug in the payload", async () => {
    const { recordNotOutbreakSkip } = await import("../triage-document.js");
    await recordNotOutbreakSkip("doc-uuid-002", "africa-cdc");
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- asymmetric matcher is typed any
        payload: expect.objectContaining({ documentId: "doc-uuid-002", sourceSlug: "africa-cdc" }),
      }),
    );
  });
});
