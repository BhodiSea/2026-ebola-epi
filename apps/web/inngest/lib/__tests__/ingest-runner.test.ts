// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
vi.mock("@/lib/db", () => ({ db: { insert: mockInsert } }));

vi.mock("@/inngest/lib/persist-extraction", () => ({
  resolveSourceId: vi.fn().mockResolvedValue("source-uuid-123"),
  upsertDocument: vi.fn().mockResolvedValue("doc-uuid-456"),
}));

vi.mock("@/inngest/lib/rate-limit-error", () => ({
  translateRateLimitError: (e: unknown) =>
    Promise.reject(e instanceof Error ? e : new Error(String(e))),
}));

function makeAdapter(overrides: {
  fetch?: ReturnType<typeof vi.fn>;
  parse?: ReturnType<typeof vi.fn>;
}) {
  return {
    sourceSlug: "africa-cdc",
    poll: vi
      .fn()
      .mockResolvedValue([{ url: "https://africacdc.org/sitrep", publishedAt: "2026-05-01" }]),
    fetch:
      overrides.fetch ??
      vi
        .fn()
        .mockResolvedValue({ skipped: false, rawContent: "<html/>", sha256: Buffer.alloc(32) }),
    parse: overrides.parse ?? vi.fn().mockResolvedValue({ skipped: false, fullText: "full text" }),
  };
}

// step.run executes the callback synchronously (Inngest memoization bypassed in tests)
function makeStep() {
  return {
    run: vi.fn().mockImplementation((_id: string, fn: () => unknown) => Promise.resolve(fn())),
    sendEvent: vi.fn().mockResolvedValue(undefined),
  };
}

describe("runPerSourceIngest — fetch skip telemetry", () => {
  it("inserts an agent_actions row when fetch returns skipped", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    await runPerSourceIngest(adapter as never, step as never);

    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsertValues.mock.calls[0]?.[0] as {
      action: string;
      payload: { reason: string; stage: string };
    };
    expect(payload.action).toBe("ingest_skipped");
    expect(payload.payload.stage).toBe("fetch");
    expect(payload.payload.reason).toBe("chromium_required");
  });

  it("does not emit triage event when fetch is skipped", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });
});

describe("runPerSourceIngest — parse skip telemetry", () => {
  it("inserts an agent_actions row when parse returns skipped", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = makeAdapter({
      parse: vi.fn().mockResolvedValue({ skipped: true, reason: "no_table_found" }),
    });

    await runPerSourceIngest(adapter as never, step as never);

    expect(mockInsert).toHaveBeenCalled();
    const payload = mockInsertValues.mock.calls[0]?.[0] as {
      action: string;
      payload: { reason: string; stage: string };
    };
    expect(payload.action).toBe("ingest_skipped");
    expect(payload.payload.stage).toBe("parse");
    expect(payload.payload.reason).toBe("no_table_found");
  });
});
