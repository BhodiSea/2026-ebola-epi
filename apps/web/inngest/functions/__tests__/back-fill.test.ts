// @vitest-environment node
// BatchResultItem.type now includes "canceled" to match SDK MessageBatchResult union.
import { describe, expect, it, vi } from "vitest";

// -- Config assertions --------------------------------------------------------

import { BACK_FILL_FN_CONFIG, BACK_FILL_TRIGGER } from "../back-fill-config.js";
import { DOCUMENT_BACKFILL_REQUESTED } from "../pipeline-events-config.js";

vi.mock("server-only", () => ({}));

// Prevent persist-extraction (and its env/Anthropic module-level init) from loading.
vi.mock("@/inngest/lib/persist-extraction", () => ({ persistExtraction: vi.fn() }));

describe("BACK_FILL_FN_CONFIG", () => {
  it("has id 'back-fill-extraction'", () => {
    expect(BACK_FILL_FN_CONFIG.id).toBe("back-fill-extraction");
  });

  it("retries is 1 (expensive batch op — limit retries)", () => {
    expect(BACK_FILL_FN_CONFIG.retries).toBe(1);
  });
});

describe("BACK_FILL_TRIGGER", () => {
  it("listens on DOCUMENT_BACKFILL_REQUESTED event", () => {
    expect(BACK_FILL_TRIGGER.event).toBe(DOCUMENT_BACKFILL_REQUESTED);
  });
});

describe("DOCUMENT_BACKFILL_REQUESTED", () => {
  it("uses dot-separated format matching the pipeline convention", () => {
    expect(DOCUMENT_BACKFILL_REQUESTED).toBe("document.backfill.requested");
  });
});

// -- buildBatchRequests --------------------------------------------------------
// Tests that buildBatchRequests maps documentIds to correctly-shaped batch requests.

const mockDocRows = [
  { id: "doc-aaa", fullText: "WHO Disease Outbreak News – Ebola virus disease" },
  { id: "doc-bbb", fullText: "WHO Disease Outbreak News – Marburg virus disease" },
];

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockDocRows),
    })),
  },
}));
vi.mock("@ituri/db", () => ({
  documents: { id: "id", fullText: "full_text" },
}));

describe("buildBatchRequests", () => {
  it("returns one request per document id", async () => {
    const { buildBatchRequests } = await import("@/inngest/lib/back-fill");
    const requests = await buildBatchRequests(["doc-aaa", "doc-bbb"]);
    expect(requests).toHaveLength(2);
  });

  it("sets custom_id to backfill-<documentId>", async () => {
    const { buildBatchRequests } = await import("@/inngest/lib/back-fill");
    const requests = await buildBatchRequests(["doc-aaa"]);
    expect(requests[0]?.custom_id).toBe("backfill-doc-aaa");
  });

  it("includes model, system, tools and messages in each request", async () => {
    const { buildBatchRequests } = await import("@/inngest/lib/back-fill");
    const requests = await buildBatchRequests(["doc-aaa"]);
    const req = requests[0]?.params;
    expect(req).toBeDefined();
    expect(req?.model).toBeTruthy();
    expect(req?.system).toBeTruthy();
    expect(req?.tools).toBeTruthy();
    expect(req?.messages).toHaveLength(1);
  });

  it("returns empty array when documentIds is empty (guards against inArray SQL error)", async () => {
    const { buildBatchRequests } = await import("@/inngest/lib/back-fill");
    const requests = await buildBatchRequests([]);
    expect(requests).toHaveLength(0);
  });
});
