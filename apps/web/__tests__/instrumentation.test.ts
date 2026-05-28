// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("instrumentation", () => {
  it("exports a register function", async () => {
    const mod = await import("../instrumentation.js");
    expect(typeof mod.register).toBe("function");
  });

  it("register() resolves without throwing when env vars are absent", async () => {
    const { register } = await import("../instrumentation.js");
    await expect(register()).resolves.not.toThrow();
  });
});
