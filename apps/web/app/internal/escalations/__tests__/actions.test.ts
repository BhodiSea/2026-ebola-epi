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

type RawAction = (input: { incidentId: string }) => Promise<unknown>;

const TEST_ID = "00000000-0000-0000-0000-000000000001";

describe("ackIncidentAction", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls update with status=acked", async () => {
    const { ackIncidentAction } = await import("../actions");
    await (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "acked" }));
  });

  it("sets ack_by to the user email from ctx", async () => {
    const { ackIncidentAction } = await import("../actions");
    await (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ ack_by: "admin@test.com" }));
  });

  it("includes a string ack_at timestamp", async () => {
    const { ackIncidentAction } = await import("../actions");
    await (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ ack_at: expect.any(String) }),
    );
  });

  it("calls eq with the incident id", async () => {
    const { ackIncidentAction } = await import("../actions");
    await (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID });
    expect(mockEq).toHaveBeenCalledWith("id", TEST_ID);
  });

  it("revalidates /internal/escalations after success", async () => {
    const { ackIncidentAction } = await import("../actions");
    await (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/internal/escalations");
  });

  it("throws when supabase returns an error", async () => {
    mockEq.mockResolvedValueOnce({ error: { message: "DB error" } });
    const { ackIncidentAction } = await import("../actions");
    await expect(
      (ackIncidentAction as unknown as RawAction)({ incidentId: TEST_ID }),
    ).rejects.toThrow("DB error");
  });
});
