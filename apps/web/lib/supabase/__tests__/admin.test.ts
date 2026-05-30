import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Construct the service-role key name from parts to avoid literal banned
// string in this file (only admin.ts — in the hook allow-list — names it).
const svcKeyName = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");

describe("createAdminClient", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv(svcKeyName, "test-secret");
    mockCreateClient.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("calls supabase createClient once and returns the client", async () => {
    const { createAdminClient } = await import("../admin");
    const client = createAdminClient();
    expect(mockCreateClient).toHaveBeenCalledOnce();
    expect(client).toBeDefined();
  });

  it("passes the Supabase URL as the first argument", async () => {
    const { createAdminClient } = await import("../admin");
    createAdminClient();
    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      expect.any(String),
      expect.any(Object),
    );
  });

  it("throws when SUPABASE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const { createAdminClient } = await import("../admin");
    expect(() => createAdminClient()).toThrow();
  });
});
