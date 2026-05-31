// @vitest-environment node
// Tests cover runPerSourceIngest orchestration (fetch→parse→persist→emit).
// WS2: parse() now receives ParseInput; rawBytes conditional spread avoids exactOptionalPropertyTypes error.
// WS2 §2.2: chromium fallback path — kill-switch gate, daily cap, fetchJsRendered, re-parse.
// WS2 §2.1: upsertDocument now accepts mimeType/language (passed through from parse results).
// Refactor: PollItem and FetchParseResult changed from type aliases to interfaces; AGENT_SLUG constant extracted.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectWhere = vi.fn().mockResolvedValue([{ cnt: 0 }]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

vi.mock("@/lib/db", () => ({ db: { insert: mockInsert, select: mockSelect } }));

const mockChromiumFallbackEnabled = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/kill-switch", () => ({ chromiumFallbackEnabled: mockChromiumFallbackEnabled }));

const mockFetchJsRendered = vi.fn().mockResolvedValue("<html>rendered africa cdc content</html>");
vi.mock("@/inngest/lib/fetch-with-sandbox", () => ({ fetchJsRendered: mockFetchJsRendered }));

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
      vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "<html/>",
        sha256: Buffer.alloc(32),
        mimeType: "text/html",
      }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("inserts an agent_actions row when fetch returns skipped", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- IngestAdapter and InngestStep have deep generics; cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockInsert).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect agent_actions row payload in assertion
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- IngestAdapter and InngestStep have deep generics; cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });
});

describe("runPerSourceIngest — parse skip telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("inserts an agent_actions row when parse returns skipped", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = makeAdapter({
      parse: vi.fn().mockResolvedValue({ skipped: true, reason: "no_table_found" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- IngestAdapter and InngestStep have deep generics; cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockInsert).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect agent_actions row payload in assertion
    const payload = mockInsertValues.mock.calls[0]?.[0] as {
      action: string;
      payload: { reason: string; stage: string };
    };
    expect(payload.action).toBe("ingest_skipped");
    expect(payload.payload.stage).toBe("parse");
    expect(payload.payload.reason).toBe("no_table_found");
  });
});

describe("runPerSourceIngest — chromium fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(true);
    mockFetchJsRendered.mockResolvedValue("<html>rendered africa cdc content</html>");
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("calls fetchJsRendered when reason is chromium_required and kill-switch is on", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockFetchJsRendered).toHaveBeenCalledWith("https://africacdc.org/sitrep");
  });

  it("skips fallback and logs ingest_skipped when kill-switch is off", async () => {
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockFetchJsRendered).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect payload
    const firstCall = mockInsertValues.mock.calls[0]?.[0] as { action: string };
    expect(firstCall.action).toBe("ingest_skipped");
  });

  it("logs chromium_daily_cap_reached and skips when daily cap is reached", async () => {
    mockSelectWhere.mockResolvedValue([{ cnt: 5 }]);
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockFetchJsRendered).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect payload
    const firstCall = mockInsertValues.mock.calls[0]?.[0] as { action: string };
    expect(firstCall.action).toBe("chromium_daily_cap_reached");
  });

  it("logs chromium_sandbox_invoked after successful Chromium fetch", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to read action field
    const actions = mockInsertValues.mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(actions).toContain("chromium_sandbox_invoked");
  });

  it("emits DOCUMENT_TRIAGE_REQUESTED after successful Chromium fallback parse", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({ skipped: true, reason: "chromium_required" }),
      parse: vi.fn().mockResolvedValue({ skipped: false, fullText: "rendered full text" }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast required for vitest mock args
    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).toHaveBeenCalled();
  });
});
