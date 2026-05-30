import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockFetch, mockRevalidatePath } = vi.hoisted(() => {
  const fetch = vi.fn();
  const revalidatePath = vi.fn();
  return { mockFetch: fetch, mockRevalidatePath: revalidatePath };
});

vi.stubGlobal("fetch", mockFetch);

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/env", () => ({
  env: { INNGEST_SIGNING_KEY: "test-signing-key" },
}));

vi.mock("@/lib/actions/client", () => ({
  internalAction: {
    inputSchema: vi.fn(() => ({
      action: vi.fn(
        (handler: (args: { ctx: unknown; parsedInput: unknown }) => Promise<unknown>) =>
          (input: unknown) =>
            handler({
              ctx: { user: { email: "admin@test.com" }, supabase: {} },
              parsedInput: input,
            }),
      ),
    })),
  },
}));

type RawAction = (input: { runId: string }) => Promise<unknown>;

const TEST_RUN_ID = "01JXTEST000000000000000001";

describe("retryInngestRunAction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POSTs to the Inngest retry endpoint with the run id", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { retryInngestRunAction } = await import("../actions");
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.inngest.com/v1/runs/${TEST_RUN_ID}/retry`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("includes the Bearer signing key in Authorization header", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { retryInngestRunAction } = await import("../actions");
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-signing-key");
  });

  it("throws when Inngest returns a non-2xx status", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { retryInngestRunAction } = await import("../actions");
    await expect(
      (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID }),
    ).rejects.toThrow();
  });

  it("revalidates /internal/pipeline after success", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { retryInngestRunAction } = await import("../actions");
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/pipeline");
  });
});
