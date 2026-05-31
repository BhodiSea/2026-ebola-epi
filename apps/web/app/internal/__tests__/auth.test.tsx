import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("internal layout auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("redirects to /auth/login when getUser returns null user", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const { default: InternalLayout } = await import("../layout");

    await InternalLayout({ children: null });

    expect(redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("renders children when user is admin", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "u_123",
              email: "admin@test.com",

              app_metadata: { role: "admin" },
            },
          },
          error: null,
        }),
      },
    } as never);

    const { default: InternalLayout } = await import("../layout");

    const result = await InternalLayout({ children: <span>hello</span> });

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("redirects to /today when user is authenticated but not admin", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "u_456",
              email: "user@test.com",

              app_metadata: {},
            },
          },
          error: null,
        }),
      },
    } as never);

    const { default: InternalLayout } = await import("../layout");

    await InternalLayout({ children: null });

    expect(redirect).toHaveBeenCalledWith("/today");
  });

  it("renders children when user has staff role", async () => {
    const { createClient } = await import("@/lib/supabase/server");

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "u_789",
              email: "staff@test.com",

              app_metadata: { role: "staff" },
            },
          },
          error: null,
        }),
      },
    } as never);

    const { default: InternalLayout } = await import("../layout");

    const result = await InternalLayout({ children: <span>hi</span> });

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
