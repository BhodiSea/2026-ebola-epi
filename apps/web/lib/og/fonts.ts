export interface FontOptions {
  data: ArrayBuffer;
  name: string;
  style?: "italic" | "normal";
  weight?: Weight;
}

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

const FONT_PATHS: { name: string; path: string; style: "italic" | "normal"; weight: Weight }[] = [
  { path: "/fonts/GeistSans-Regular.woff2", name: "Geist Sans", weight: 400, style: "normal" },
  { path: "/fonts/GeistSans-Bold.woff2", name: "Geist Sans", weight: 700, style: "normal" },
  { path: "/fonts/GeistSans-Italic.woff2", name: "Geist Sans", weight: 400, style: "italic" },
  {
    path: "/fonts/SourceSerif4-Italic.woff2",
    name: "Source Serif 4",
    weight: 400,
    style: "italic",
  },
];

/**
 * Loads OG card fonts from `public/fonts/` at request time.
 * Returns an empty array on any fetch failure so image generation degrades
 * gracefully to the satori system-sans fallback.
 */
export async function getOgFonts(baseUrl: string): Promise<FontOptions[]> {
  try {
    const fonts = await Promise.all(
      FONT_PATHS.map(async (f) => {
        const r = await fetch(`${baseUrl}${f.path}`);
        const data = await r.arrayBuffer();
        return { data, name: f.name, weight: f.weight, style: f.style };
      }),
    );
    return fonts;
  } catch {
    return [];
  }
}
