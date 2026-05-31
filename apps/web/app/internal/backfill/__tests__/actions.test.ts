import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockInngestSend, mockRevalidatePath } = vi.hoisted(() => ({
  mockInngestSend: vi.fn().mockResolvedValue(undefined),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/inngest/client", () => ({ inngest: { send: mockInngestSend } }));

vi.mock("@/lib/actions/client", () => ({
  internalAction: {
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

type RawAction = (input: { documentIds: string[] }) => Promise<unknown>;

const VALID_IDS = ["aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb"];

describe("enqueueBackfillAction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("sends DOCUMENT_BACKFILL_REQUESTED event with provided document ids", async () => {
    const { enqueueBackfillAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (enqueueBackfillAction as unknown as RawAction)({ documentIds: VALID_IDS });
    expect(mockInngestSend).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect Inngest send payload
    const call = mockInngestSend.mock.calls[0]![0] as {
      data: { documentIds: string[] };
      name: string;
    };
    expect(call.name).toBe("document.backfill.requested");
    expect(call.data.documentIds).toEqual(VALID_IDS);
  });

  it("revalidates /internal/backfill after success", async () => {
    const { enqueueBackfillAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (enqueueBackfillAction as unknown as RawAction)({ documentIds: VALID_IDS });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/backfill");
  });

  it("rejects empty documentIds array", async () => {
    const { enqueueBackfillAction } = await import("../actions");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (enqueueBackfillAction as unknown as RawAction)({ documentIds: [] }),
    ).rejects.toThrow();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("rejects non-UUID document id", async () => {
    const { enqueueBackfillAction } = await import("../actions");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (enqueueBackfillAction as unknown as RawAction)({ documentIds: ["not-a-uuid"] }),
    ).rejects.toThrow();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("rejects more than 200 document ids", async () => {
    const { enqueueBackfillAction } = await import("../actions");
    const ids = Array.from(
      { length: 201 },
      (_, i) => `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
    );
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (enqueueBackfillAction as unknown as RawAction)({ documentIds: ids }),
    ).rejects.toThrow();
    expect(mockInngestSend).not.toHaveBeenCalled();
  });
});
