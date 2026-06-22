// @vitest-environment node
// G-11: rawBytes threaded from fetchResult into upsertDocument (exactOptionalPropertyTypes: conditional spread).
// Tests cover runPerSourceIngest orchestration (fetch→parse→persist→emit).
// WS2: parse() now receives ParseInput; rawBytes conditional spread avoids exactOptionalPropertyTypes error.
// WS2 §2.2: chromium fallback path — kill-switch gate, daily cap, fetchJsRendered, re-parse.
// Lint: catch param renamed to `error`; union type reordered to `null | PollItem[]` (perfectionist/unicorn).
// WS2 §2.1: upsertDocument now accepts mimeType/language (passed through from parse results).
// Phase 4.3: extraction_paused gate — short-circuits before poll when source is paused.
// Phase 4.4: uploadRawBytes removed from ingest-runner (moved into persist-extraction/upsertDocument).
// Cleanup: createAdminClient import + extFromMime + uploadRawBytes removed (dead code after Phase 4.4).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCheckExtractionPaused = vi.fn().mockResolvedValue(false);
const mockUpsertDocument = vi.fn().mockResolvedValue("doc-uuid-456");

vi.mock("@/inngest/lib/persist-extraction", () => ({
  resolveSourceId: vi.fn().mockResolvedValue("source-uuid-123"),
  upsertDocument: mockUpsertDocument,
  checkExtractionPaused: mockCheckExtractionPaused,
}));

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockSelectWhere = vi.fn().mockResolvedValue([{ cnt: 0 }]);
const mockSelectFrom = vi.fn().mockReturnValue({ where: mockSelectWhere });
const mockSelect = vi.fn().mockReturnValue({ from: mockSelectFrom });

const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: { insert: mockInsert, select: mockSelect, update: mockUpdate },
}));

const mockChromiumFallbackEnabled = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/kill-switch", () => ({ chromiumFallbackEnabled: mockChromiumFallbackEnabled }));

const mockFetchJsRendered = vi.fn().mockResolvedValue("<html>rendered africa cdc content</html>");
vi.mock("@/inngest/lib/fetch-with-sandbox", () => ({ fetchJsRendered: mockFetchJsRendered }));

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
    throttleKey: "africacdc.org",
    pollInterval: "0 8 * * *",
    version: "1.0.0",
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).toHaveBeenCalled();
  });
});

describe("runPerSourceIngest — poll error telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
  });

  it("inserts ingest_failed action and rethrows when poll throws a non-ConfiguredSkipError", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = {
      ...makeAdapter({}),
      poll: vi
        .fn()
        .mockRejectedValue(new Error("who-afro RSS feed unavailable: connection refused")),
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await expect(runPerSourceIngest(adapter as never, step as never)).rejects.toThrow(
      "who-afro RSS feed unavailable",
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect action field
    const actions = mockInsertValues.mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(actions).toContain("ingest_failed");
  });
});

describe("runPerSourceIngest — ConfiguredSkipError (A1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
  });

  it("inserts a skipped_no_credentials agent_actions row when poll throws ConfiguredSkipError", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const { ConfiguredSkipError } = await import("@ituri/ingest");
    mockInsert.mockClear();
    mockInsertValues.mockClear();

    const step = makeStep();
    const adapter = {
      ...makeAdapter({}),
      poll: vi
        .fn()
        .mockRejectedValue(new ConfiguredSkipError("ACLED_ACCESS_TOKEN is not configured")),
    };

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect action field
    const actions = mockInsertValues.mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(actions).toContain("skipped_no_credentials");
  });

  it("does not emit a triage event when poll throws ConfiguredSkipError", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const { ConfiguredSkipError } = await import("@ituri/ingest");

    const step = makeStep();
    const adapter = {
      ...makeAdapter({}),
      poll: vi
        .fn()
        .mockRejectedValue(new ConfiguredSkipError("ACLED_ACCESS_TOKEN is not configured")),
    };

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("does not update source health when poll throws ConfiguredSkipError", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const { ConfiguredSkipError } = await import("@ituri/ingest");
    mockUpdate.mockClear();

    const step = makeStep();
    const adapter = {
      ...makeAdapter({}),
      poll: vi
        .fn()
        .mockRejectedValue(new ConfiguredSkipError("ACLED_ACCESS_TOKEN is not configured")),
    };

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("runPerSourceIngest — source health update (G-4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
  });

  it("calls db.update(sources) after a successful poll run", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockUpdate).toHaveBeenCalled();
  });

  it("sets parserVersion to adapter.version on the health update", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any; step does not satisfy GetStepTools
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed any[]; cast to inspect the set() argument
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as undefined | { parserVersion: string };
    expect(setArg?.parserVersion).toBe("1.0.0");
  });
});

describe("runPerSourceIngest — rawBytes threading (Phase 4.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockCheckExtractionPaused.mockResolvedValue(false);
    mockUpsertDocument.mockResolvedValue("doc-uuid-456");
  });

  it("passes rawBytes to upsertDocument when fetch returns rawBytes", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const rawBytes = Buffer.from("<html/>");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "<html/>",
        rawBytes,
        sha256: Buffer.alloc(32),
        mimeType: "text/html",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect upsertDocument params
    const upsertArg = mockUpsertDocument.mock.calls[0]?.[0] as { rawBytes?: Buffer };
    expect(upsertArg.rawBytes).toBe(rawBytes);
  });

  it("calls upsertDocument without rawBytes when fetch omits it", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "<html/>",
        sha256: Buffer.alloc(32),
        mimeType: "text/html",
        // rawBytes intentionally absent
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect upsertDocument params
    const upsertArg = mockUpsertDocument.mock.calls[0]?.[0] as { rawBytes?: Buffer };
    expect(upsertArg.rawBytes).toBeUndefined();
  });
});

describe("runPerSourceIngest — extraction_paused gate (Phase 4.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: mockInsertValues });
    mockInsertValues.mockResolvedValue(undefined);
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockChromiumFallbackEnabled.mockResolvedValue(false);
    mockSelectWhere.mockResolvedValue([{ cnt: 0 }]);
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockCheckExtractionPaused.mockResolvedValue(false);
    mockUpsertDocument.mockResolvedValue("doc-uuid-456");
  });

  it("inserts ingest_skipped_paused and returns early when source is paused", async () => {
    mockCheckExtractionPaused.mockResolvedValue(true);
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cast to inspect action field
    const actions = mockInsertValues.mock.calls.map((c) => (c[0] as { action: string }).action);
    expect(actions).toContain("ingest_skipped_paused");
  });

  it("does not poll when source is paused", async () => {
    mockCheckExtractionPaused.mockResolvedValue(true);
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(adapter.poll).not.toHaveBeenCalled();
  });

  it("does not emit triage event when source is paused", async () => {
    mockCheckExtractionPaused.mockResolvedValue(true);
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it("proceeds normally when source is not paused", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const step = makeStep();
    const adapter = makeAdapter({});

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(adapter.poll).toHaveBeenCalled();
    expect(step.sendEvent).toHaveBeenCalled();
  });
});
