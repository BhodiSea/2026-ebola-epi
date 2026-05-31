import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
vi.stubGlobal("fetch", mockFetch);

type Handler = (ctx: { parsedInput: { runId: string } }) => Promise<unknown>;
let handler: Handler | undefined;

vi.mock("@/lib/actions/client", () => ({
  internalAction: {
    inputSchema: () => ({
      action: (fn: Handler) => {
        handler = fn;
        return {};
      },
    }),
  },
}));

describe("retryInngestRunAction", () => {
  beforeAll(async () => {
    vi.mock("@/lib/env", () => ({
      env: {
        INNGEST_API_KEY: "apikey-test-00000000",
        INNGEST_SIGNING_KEY: "signkey-test-00000000",
      },
    }));
    await import("../pipeline/actions");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses INNGEST_API_KEY as the Bearer token, not INNGEST_SIGNING_KEY", async () => {
    expect(handler).toBeDefined();
    mockFetch.mockResolvedValue({ ok: true });
    await handler!({ parsedInput: { runId: "run-abc123" } });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect fetch call arguments
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("run-abc123/retry");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fetch RequestInit.headers narrowed for header inspection
    const auth = (opts.headers as Record<string, string>).Authorization;
    expect(auth).toBe("Bearer apikey-test-00000000");
    expect(auth).not.toContain("signkey");
  });

  it("throws a descriptive error when Inngest returns non-ok", async () => {
    expect(handler).toBeDefined();
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(handler!({ parsedInput: { runId: "run-xyz" } })).rejects.toThrow("403");
  });
});
