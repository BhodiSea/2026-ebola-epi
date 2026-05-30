import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const { getUser, protect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  protect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({ auth: { getUser } }),
}));

vi.mock("@arcjet/next", () => ({
  request: () => Promise.resolve({}),
}));

vi.mock("@/lib/arcjet", () => ({
  ajInternal: { protect },
}));

describe("authedAction", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns a serverError when the user is not authenticated", async () => {
    const { authedAction } = await import("../client");
    const testAction = authedAction.inputSchema(z.object({})).action(async () => "ok");
    const result = await testAction({});
    expect(result.serverError).toBeTruthy();
  });
});

describe("internalAction", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "admin@example.com" } },
    });
    protect.mockResolvedValue({ isDenied: () => true });
  });

  it("returns RATE_LIMITED serverError when arcjet denies the request", async () => {
    const { internalAction } = await import("../client");
    const testAction = internalAction.inputSchema(z.object({})).action(async () => "ok");
    const result = await testAction({});
    expect(result.serverError).toBe("RATE_LIMITED");
  });
});
