import type React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/command-bar-store", () => ({ subscribe: vi.fn(() => vi.fn()) }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(), usePathname: vi.fn(() => "/") }));

describe("CommandBar", () => {
  it("exports CommandBar as a named export", async () => {
    const mod = await import("../command-bar");
    expect(typeof mod.CommandBar).toBe("function");
  });

  it("does not export STUB_GROUPS", async () => {
    const mod = await import("../command-bar");
    expect((mod as Record<string, unknown>).STUB_GROUPS).toBeUndefined();
  });
});
