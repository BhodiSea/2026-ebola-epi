// @vitest-environment node
// Covers: getOgFonts() fs-based implementation with TTF/WOFF2 filtering
import { readFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
});

// TTF: first byte is NUL (0x00) — not the WOFF/WOFF2 prefix "wOF"
function makeTtfBuf(): Buffer {
  return Buffer.alloc(8); // alloc zero-fills; byte 0 = 0x00
}

// WOFF2: starts with "wOF2" — rejected by satori
function makeWoff2Buf(): Buffer {
  return Buffer.from("wOF2", "ascii");
}

describe("getOgFonts", () => {
  it("returns TTF font entries and filters out WOFF2", async () => {
    // FONT_FILES has 2 entries; first → TTF kept, second → WOFF2 filtered
    vi.mocked(readFile as (path: string) => Promise<Buffer>)
      .mockResolvedValueOnce(makeTtfBuf())
      .mockResolvedValueOnce(makeWoff2Buf());

    const { getOgFonts } = await import("../fonts");
    const fonts = await getOgFonts();

    expect(fonts.length).toBe(1);
    const first = fonts[0];
    expect(first).toBeDefined();
    expect(new DataView(first!.data).getUint8(0)).toBe(0x00);
  });

  it("returns empty array if readFile throws", async () => {
    vi.mocked(readFile as (path: string) => Promise<Buffer>).mockRejectedValue(new Error("ENOENT"));

    const { getOgFonts } = await import("../fonts");
    expect(await getOgFonts()).toEqual([]);
  });

  it("returns empty array if all fonts are WOFF2", async () => {
    vi.mocked(readFile as (path: string) => Promise<Buffer>).mockResolvedValue(makeWoff2Buf());

    const { getOgFonts } = await import("../fonts");
    expect(await getOgFonts()).toEqual([]);
  });
});
