import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockEq, mockUpdate, mockAdminClient, mockRevalidatePath } = vi.hoisted(() => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  const adminClient = vi.fn(() => ({ from }));
  const revalidatePath = vi.fn();
  return {
    mockEq: eq,
    mockUpdate: update,
    mockAdminClient: adminClient,
    mockRevalidatePath: revalidatePath,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockAdminClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
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

type RawAction = (input: { paused: boolean; sourceId: string }) => Promise<unknown>;

const TEST_ID_1 = "00000000-0000-0000-0000-000000000001";
const TEST_ID_2 = "00000000-0000-0000-0000-000000000002";
const TEST_ID_3 = "00000000-0000-0000-0000-000000000003";
const TEST_ID_4 = "00000000-0000-0000-0000-000000000004";

describe("toggleSourcePauseAction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls update with extraction_paused=true", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_1 });
    expect(mockUpdate).toHaveBeenCalledWith({ extraction_paused: true });
  });

  it("calls update with extraction_paused=false when resuming", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: false, sourceId: TEST_ID_2 });
    expect(mockUpdate).toHaveBeenCalledWith({ extraction_paused: false });
  });

  it("calls eq with the source id", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_3 });
    expect(mockEq).toHaveBeenCalledWith("id", TEST_ID_3);
  });

  it("revalidates /internal/sources after success", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: false, sourceId: TEST_ID_1 });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/sources");
  });

  it("throws when supabase returns an error", async () => {
    mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
    const { toggleSourcePauseAction } = await import("../actions");
    await expect(
      (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_4 }),
    ).rejects.toThrow("DB error");
  });
});
