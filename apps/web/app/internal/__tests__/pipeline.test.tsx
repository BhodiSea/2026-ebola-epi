import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/env", () => ({
  env: {
    INNGEST_SIGNING_KEY: "signkey-test-00000000",

    INNGEST_API_KEY: "apikey-test-00000000",
  },
}));

vi.mock("@/components/internal/retry-button", () => ({
  RetryButton: vi.fn(() => null),
}));

describe("/internal/pipeline page", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exports a default async function", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const mod = await import("../pipeline/page");
    expect(typeof mod.default).toBe("function");
  });

  it("uses INNGEST_API_KEY as the Bearer token, not INNGEST_SIGNING_KEY", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    const { default: PipelinePage } = await import("../pipeline/page");
    await PipelinePage();
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer apikey-test-00000000");
    expect(headers.Authorization).not.toContain("signkey");
  });

  it("renders without throwing when fetch returns non-ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const { default: PipelinePage } = await import("../pipeline/page");
    const result = await PipelinePage();
    expect(result).toBeTruthy();
  });
});
