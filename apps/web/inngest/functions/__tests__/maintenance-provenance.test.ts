// @vitest-environment node
// Tests for the provenance-coverage step group added in WS4.
// Isolated from maintenance.test.ts to avoid mock conflicts with the
// existing openGithubPR tests (which need the real @/lib/notify module).
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DOCUMENT_BACKFILL_REQUESTED } from "../pipeline-events-config.js";

vi.mock("server-only", () => ({}));

// @t3-oss/env-nextjs throws on missing server vars; stub it before any import
// that transitively loads lib/env.ts (e.g. inngest/lib/persist-extraction.ts).
vi.mock("@/lib/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "test-key",
    INNGEST_EVENT_KEY: "test-event-key",
    INNGEST_SIGNING_KEY: "test-signing-key",
    POSTGRES_URL_NON_POOLING: "postgres://localhost/test",
    GITHUB_TOKEN: undefined,
    GITHUB_REPO: undefined,
    SLACK_WEBHOOK_URL: undefined,
  },
}));

vi.mock("@slack/webhook", () => ({
  IncomingWebhook: vi.fn(() => ({ send: vi.fn() })),
}));

// ── capture the Inngest handler ───────────────────────────────────────────────

type HandlerFn = (args: {
  step: {
    run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
    sendEvent: (name: string, event: unknown) => Promise<unknown>;
  };
}) => Promise<unknown>;

const capturedHandler = vi.hoisted((): { fn: HandlerFn | null } => ({ fn: null }));

// "../../client" from __tests__/ resolves to inngest/client.ts — same target
// as maintenance.ts's "../client" import.
vi.mock("../../client", () => ({
  inngest: {
    createFunction: vi.fn((_config: unknown, _trigger: unknown, handler: HandlerFn) => {
      capturedHandler.fn = handler;
      return {};
    }),
  },
}));

// ── dependency mocks ──────────────────────────────────────────────────────────

// "../../lib/maintenance" from __tests__/ → inngest/lib/maintenance.ts
vi.mock("../../lib/maintenance", () => ({
  checkAndFixLinkRot: vi.fn().mockResolvedValue(0),
  checkDocDrift: vi.fn().mockResolvedValue({ changed: [] }),
  diffLastKnownGoodVsCurrent: vi.fn().mockResolvedValue(""),
  headAllSources: vi.fn().mockResolvedValue([]),
  suggestParserFix: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/notify", () => ({
  openGithubIssue: vi.fn().mockResolvedValue(null),
  openGithubPR: vi.fn().mockResolvedValue(null),
}));

const mockDbValuesInsert = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDbInsert = vi.hoisted(() => vi.fn().mockReturnValue({ values: mockDbValuesInsert }));
vi.mock("@/lib/db", () => ({ db: { insert: mockDbInsert } }));

vi.mock("@ituri/db", () => ({ agentActions: {} }));

const mockGetDocumentsWithoutProvenance = vi.hoisted(() => vi.fn());
const mockGetProvenanceCoverageStats = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queries/provenance-stats", () => ({
  getDocumentsWithoutProvenance: mockGetDocumentsWithoutProvenance,
  getProvenanceCoverageStats: mockGetProvenanceCoverageStats,
}));

// ── test setup ────────────────────────────────────────────────────────────────

// Import maintenance.ts so inngest.createFunction is called, capturing the handler.
// vi.mock factories above run first (hoisted), so mocks are in place.
await import("../maintenance.js");

const STATS_BASE = {
  totalPublished: 10,
  withVerifiedOffsets: 9,
  withPlaceholderOffsets: 1,
  documentsMissingProvenance: 0,
  percentVerified: 90,
};

function makeStep(sendEvent = vi.fn().mockResolvedValue(undefined)) {
  return {
    run: vi.fn().mockImplementation((_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDbInsert.mockReturnValue({ values: mockDbValuesInsert });
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("maintenanceAgent — provenance coverage steps", () => {
  it("sends DOCUMENT_BACKFILL_REQUESTED when documents are missing provenance", async () => {
    const missing = [{ id: "doc-1", sourceId: "src-1", sourceSlug: "who-don" }];
    mockGetDocumentsWithoutProvenance.mockResolvedValue(missing);
    mockGetProvenanceCoverageStats.mockResolvedValue({
      ...STATS_BASE,
      documentsMissingProvenance: 1,
    });

    const sendEvent = vi.fn().mockResolvedValue(undefined);
    await capturedHandler.fn?.({ step: makeStep(sendEvent) });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns AsymmetricMatcher typed as any in Vitest */
    expect(sendEvent).toHaveBeenCalledWith(
      "enqueue-provenance-backfill",
      expect.objectContaining({
        name: DOCUMENT_BACKFILL_REQUESTED,
        data: expect.objectContaining({ documentIds: ["doc-1"] }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it("does not send an event when no documents are missing provenance", async () => {
    mockGetDocumentsWithoutProvenance.mockResolvedValue([]);
    mockGetProvenanceCoverageStats.mockResolvedValue(STATS_BASE);

    const sendEvent = vi.fn().mockResolvedValue(undefined);
    await capturedHandler.fn?.({ step: makeStep(sendEvent) });

    const provenanceSendCalls = sendEvent.mock.calls.filter(
      (c) => c[0] === "enqueue-provenance-backfill",
    );
    expect(provenanceSendCalls).toHaveLength(0);
  });

  it("writes an agent_actions row with provenance stats even when nothing is missing", async () => {
    mockGetDocumentsWithoutProvenance.mockResolvedValue([]);
    mockGetProvenanceCoverageStats.mockResolvedValue(STATS_BASE);

    await capturedHandler.fn?.({ step: makeStep() });

    expect(mockDbInsert).toHaveBeenCalled();
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns AsymmetricMatcher typed as any in Vitest */
    expect(mockDbValuesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: "maintenance",
        action: "provenance_coverage_logged",
        subjectTable: "case_counts",
        payload: expect.objectContaining({
          totalPublished: 10,
          percentVerified: 90,
          enqueuedDocuments: 0,
        }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });
});
