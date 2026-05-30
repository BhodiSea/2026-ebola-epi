import { describe, expect, it } from "vitest";

import { config } from "../vercel";

describe("vercel config", () => {
  it("has required build fields", () => {
    expect(config.framework).toBe("nextjs");
    expect(config.buildCommand).toContain("turbo build");
    expect(config.outputDirectory).toBe(".next");
  });

  it("does not contain firewall property (rejected by @vercel/config/v1 schema)", () => {
    expect(config).not.toHaveProperty("firewall");
  });
});
