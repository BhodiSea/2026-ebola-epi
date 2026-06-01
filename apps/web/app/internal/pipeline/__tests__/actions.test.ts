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
    // Simulate next-safe-action: run schema.parse() so zod validations are exercised
    inputSchema: vi.fn((schema: { parse: (i: unknown) => unknown }) => ({
      action: vi.fn(
        (handler: (args: { ctx: unknown; parsedInput: unknown }) => Promise<unknown>) =>
          async (input: unknown) => {
            const parsed = schema.parse(input);
            return handler({
              ctx: { user: { email: "admin@test.com" }, supabase: {} },
              parsedInput: parsed,
            });
          },
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.inngest.com/v1/runs/${TEST_RUN_ID}/retry`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses INNGEST_SIGNING_KEY as the Bearer token", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { retryInngestRunAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect fetch call arguments
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fetch RequestInit.headers narrowed for header inspection
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-signing-key");
    expect(headers.Authorization).not.toContain("test-api-key");
  });

  it("throws when Inngest returns a non-2xx status", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const { retryInngestRunAction } = await import("../actions");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID }),
    ).rejects.toThrow();
  });

  it("rejects runId containing path-traversal characters", async () => {
    const { retryInngestRunAction } = await import("../actions");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (retryInngestRunAction as unknown as RawAction)({ runId: "../../admin/delete" }),
    ).rejects.toThrow();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("revalidates /internal/pipeline after success", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const { retryInngestRunAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (retryInngestRunAction as unknown as RawAction)({ runId: TEST_RUN_ID });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/pipeline");
  });
});
