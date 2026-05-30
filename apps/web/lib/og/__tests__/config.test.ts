import { describe, expect, it } from "vitest";

// Lint-fix session: severity-badge, og-image exports, feed route, internal pages, pipeline, sources
describe("lib/og/config", () => {
  it("exports OG_SIZE with correct dimensions", async () => {
    const { OG_SIZE } = await import("../config");
    expect(OG_SIZE.width).toBe(1200);
    expect(OG_SIZE.height).toBe(630);
  });

  it("exports CONTENT_TYPE_PNG", async () => {
    const { CONTENT_TYPE_PNG } = await import("../config");
    expect(CONTENT_TYPE_PNG).toBe("image/png");
  });
});
