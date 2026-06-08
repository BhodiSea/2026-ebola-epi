import { readFile } from "node:fs/promises";
import path from "node:path";

export interface FontOptions {
  data: ArrayBuffer;
  name: string;
  style?: "italic" | "normal";
  weight?: Weight;
}

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// Geist-Regular.ttf is copied from @vercel/og/dist (bundled by Vercel, TTF format).
// The .woff2 variants in public/fonts are for CSS only — satori rejects WOFF2.
const FONT_FILES: { file: string; name: string; style: "italic" | "normal"; weight: Weight }[] = [
  { file: "Geist-Regular.ttf", name: "Geist Sans", weight: 400, style: "normal" },
  { file: "Geist-Regular.ttf", name: "Geist Sans", weight: 700, style: "normal" },
];

/**
 * Loads OG card fonts from `public/fonts/` via the filesystem.
 * Reading via fs/promises avoids self-referential HTTP fetches that break
 * when the dev-server port doesn't match NEXT_PUBLIC_SITE_URL.
 * Returns an empty array on any read failure so image generation degrades
 * gracefully to the satori system-sans fallback.
 */
export async function getOgFonts(): Promise<FontOptions[]> {
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const candidates = await Promise.all(
      FONT_FILES.map(async (f) => {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const nodeBuf = await readFile(path.join(fontsDir, f.file));
        // Buffer.buffer is the pooled ArrayBuffer; slice to get the exact bytes.
        const data = nodeBuf.buffer.slice(
          nodeBuf.byteOffset,
          nodeBuf.byteOffset + nodeBuf.byteLength,
        );
        return { data, name: f.name, weight: f.weight, style: f.style };
      }),
    );
    return candidates.filter((f) => isSatoriCompatible(f.data));
  } catch {
    return [];
  }
}

// Satori (used by @vercel/og) only accepts TTF/OTF. WOFF and WOFF2 both start
// with the ASCII prefix "wOF" — skip them so image generation degrades to
// system-sans rather than crashing the route.
function isSatoriCompatible(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) {
    return false;
  }
  const prefix = new TextDecoder().decode(new Uint8Array(data, 0, 3));
  return prefix !== "wOF";
}
