import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockEq, mockUpdate, mockAdminClient, mockRevalidatePath, mockFrom, mockInngestSend } =
  vi.hoisted(() => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const adminClient = vi.fn(() => ({ from }));
    const revalidatePath = vi.fn();
    const inngestSend = vi.fn().mockResolvedValue({ ids: ["evt_test_abc123"] });
    return {
      mockEq: eq,
      mockFrom: from,
      mockUpdate: update,
      mockAdminClient: adminClient,
      mockRevalidatePath: revalidatePath,
      mockInngestSend: inngestSend,
    };
  });

vi.mock("@/inngest/client", () => ({ inngest: { send: mockInngestSend } }));

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
              ctx: { user: { email: "admin@test.com" }, supabase: { from: mockFrom } },
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_1 });
    expect(mockUpdate).toHaveBeenCalledWith({ extraction_paused: true });
  });

  it("calls update with extraction_paused=false when resuming", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: false, sourceId: TEST_ID_2 });
    expect(mockUpdate).toHaveBeenCalledWith({ extraction_paused: false });
  });

  it("calls eq with the source id", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_3 });
    expect(mockEq).toHaveBeenCalledWith("id", TEST_ID_3);
  });

  it("revalidates /internal/sources after success", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: false, sourceId: TEST_ID_1 });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/sources");
  });

  it("throws when supabase returns an error", async () => {
    mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
    const { toggleSourcePauseAction } = await import("../actions");
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
      (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_4 }),
    ).rejects.toThrow("DB error");
  });

  it("uses ctx.supabase from internalAction, never createAdminClient()", async () => {
    const { toggleSourcePauseAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (toggleSourcePauseAction as unknown as RawAction)({ paused: true, sourceId: TEST_ID_1 });
    expect(mockAdminClient).not.toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith("sources");
  });
});

// Mock bypasses next-safe-action's { data: ... } wrapper — handler return is returned directly.
// triggerIngestPollAction: sends ingest/<slug>.poll and returns the Inngest event id for polling
type TriggerAction = (input: { slug: string }) => Promise<{ eventId: string }>;

describe("triggerIngestPollAction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("sends ingest/<slug>.poll event for who-don", async () => {
    const { triggerIngestPollAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (triggerIngestPollAction as unknown as TriggerAction)({ slug: "who-don" });
    expect(mockInngestSend).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect Inngest send payload
    const call = mockInngestSend.mock.calls[0]![0] as {
      data: { triggeredBy: string };
      name: string;
    };
    expect(call.name).toBe("ingest/who-don.poll");
  });

  it("includes triggeredBy: internal-ui in the event data", async () => {
    const { triggerIngestPollAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (triggerIngestPollAction as unknown as TriggerAction)({ slug: "who-afro" });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect Inngest send payload
    const call = mockInngestSend.mock.calls[0]![0] as {
      data: { triggeredBy: string };
      name: string;
    };
    expect(call.data.triggeredBy).toBe("internal-ui");
  });

  it("returns the event id from inngest.send", async () => {
    mockInngestSend.mockResolvedValueOnce({ ids: ["evt_test_xyz"] });
    const { triggerIngestPollAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    const result = await (triggerIngestPollAction as unknown as TriggerAction)({ slug: "who-don" });
    expect(result.eventId).toBe("evt_test_xyz");
  });

  it("sends ingest/who-afro.poll for who-afro slug", async () => {
    const { triggerIngestPollAction } = await import("../actions");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- next-safe-action bindArgsServerAction return is opaque; cast required to call handler in tests
    await (triggerIngestPollAction as unknown as TriggerAction)({ slug: "who-afro" });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- vitest mock.calls typed as any[]; cast to inspect Inngest send payload
    const call = mockInngestSend.mock.calls[0]![0] as { name: string };
    expect(call.name).toBe("ingest/who-afro.poll");
  });
});
