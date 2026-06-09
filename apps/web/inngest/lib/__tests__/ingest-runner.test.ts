// @vitest-environment node
// G-11: rawBytes threaded from fetchResult into upsertDocument (exactOptionalPropertyTypes: conditional spread).
// Tests cover runPerSourceIngest orchestration (fetch→parse→persist→emit).
// WS2: parse() now receives ParseInput; rawBytes conditional spread avoids exactOptionalPropertyTypes error.
// WS2 §2.2: chromium fallback path — kill-switch gate, daily cap, fetchJsRendered, re-parse.
// Lint: catch param renamed to `error`; union type reordered to `null | PollItem[]` (perfectionist/unicorn).
// WS2 §2.1: upsertDocument now accepts mimeType/language (passed through from parse results).
// Refactor: PollItem and FetchParseResult changed from type aliases to interfaces; AGENT_SLUG constant extracted.
// B3: upload raw bytes to source-bytes bucket via createAdminClient; non-fatal catch logs console.warn (satisfies no-restricted-syntax). uploadRawBytes accepts undefined rawBytes (guard inside helper).
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockStorageUpload = vi.fn().mockResolvedValue({ data: { path: "abc" }, error: null });
const mockStorageFrom = vi.fn().mockReturnValue({ upload: mockStorageUpload });
const mockCreateAdminClient = vi.fn().mockReturnValue({ storage: { from: mockStorageFrom } });
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mockCreateAdminClient }));

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

describe("runPerSourceIngest — source-bytes storage upload (B3)", () => {
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
    mockCreateAdminClient.mockReturnValue({ storage: { from: mockStorageFrom } });
    mockStorageFrom.mockReturnValue({ upload: mockStorageUpload });
    mockStorageUpload.mockResolvedValue({ data: { path: "abc" }, error: null });
  });

  it("uploads raw bytes to source-bytes with sha256 path when fetch returns rawBytes", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const sha256Buf = Buffer.alloc(32, 171);
    const sha256Hex = sha256Buf.toString("hex");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "<html/>",
        rawBytes: Buffer.from("<html/>"),
        sha256: sha256Buf,
        mimeType: "text/html",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockStorageFrom).toHaveBeenCalledWith("source-bytes");
    expect(mockStorageUpload).toHaveBeenCalledWith(
      `${sha256Hex}.html`,
      expect.any(Buffer),
      expect.objectContaining({ contentType: "text/html", upsert: true }),
    );
  });

  it("uses .pdf extension for application/pdf mime type", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    const sha256Buf = Buffer.alloc(32, 205);
    const sha256Hex = sha256Buf.toString("hex");
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "",
        rawBytes: Buffer.alloc(8),
        sha256: sha256Buf,
        mimeType: "application/pdf",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await runPerSourceIngest(adapter as never, step as never);

    expect(mockStorageUpload).toHaveBeenCalledWith(
      `${sha256Hex}.pdf`,
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not throw when storage upload rejects (silent skip)", async () => {
    const { runPerSourceIngest } = await import("@/inngest/lib/ingest-runner");
    mockStorageUpload.mockRejectedValueOnce(new Error("storage unavailable"));
    const step = makeStep();
    const adapter = makeAdapter({
      fetch: vi.fn().mockResolvedValue({
        skipped: false,
        rawContent: "<html/>",
        rawBytes: Buffer.from("<html/>"),
        sha256: Buffer.alloc(32),
        mimeType: "text/html",
      }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock types resolve to any
    await expect(runPerSourceIngest(adapter as never, step as never)).resolves.toBeUndefined();
  });
});
