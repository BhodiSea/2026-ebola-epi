import { describe, expect, it, vi } from "vitest";

vi.mock("../env", () => ({
  env: { ARCJET_KEY: undefined },
}));

// Arcjet clients are module-level singletons — we verify the exports exist
// and are distinct instances rather than inspecting internal rule configuration,
// which is an implementation detail of the arcjet package.
describe("arcjet exports", () => {
  it("exports aj (public client)", async () => {
    const mod = await import("../arcjet");
    expect(mod.aj).toBeDefined();
  }, 15_000);

  it("exports ajInternal (internal client with token bucket)", async () => {
    const mod = await import("../arcjet");
    expect(mod.ajInternal).toBeDefined();
  });

  it("exports ajRead (read-only client)", async () => {
    const mod = await import("../arcjet");
    expect(mod.ajRead).toBeDefined();
  });

  it("aj and ajInternal are distinct clients", async () => {
    const mod = await import("../arcjet");
    expect(mod.aj).not.toBe(mod.ajInternal);
  });

  it("ajInternal and ajRead are distinct clients", async () => {
    const mod = await import("../arcjet");
    expect(mod.ajInternal).not.toBe(mod.ajRead);
  });
});
