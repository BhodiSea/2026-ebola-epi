import { describe, expect, it, vi } from "vitest";

describe("getOgFonts", () => {
  it("returns at least two font entries with non-empty data on success", async () => {
    const mockBuffer = new ArrayBuffer(8);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ arrayBuffer: () => mockBuffer }));

    const { getOgFonts } = await import("../fonts");
    const fonts = await getOgFonts("http://localhost:3000");

    const VALID_WEIGHTS = new Set([100, 200, 300, 400, 500, 600, 700, 800, 900]);
    expect(fonts.length).toBeGreaterThanOrEqual(2);
    const names = new Set(fonts.map((f) => f.name));
    expect(names.has("Geist Sans")).toBe(true);
    expect(names.has("Source Serif 4")).toBe(true);
    for (const f of fonts) {
      expect(f.data).toBe(mockBuffer);
      expect(typeof f.name).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.weight === undefined || VALID_WEIGHTS.has(f.weight)).toBe(true);
    }

    vi.unstubAllGlobals();
  });

  it("returns empty array if fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { getOgFonts } = await import("../fonts");
    const fonts = await getOgFonts("http://localhost:3000");

    expect(fonts).toEqual([]);

    vi.unstubAllGlobals();
  });
});
