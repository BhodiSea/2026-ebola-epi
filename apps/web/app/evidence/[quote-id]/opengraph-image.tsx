import { ImageResponse } from "@vercel/og";

import { OG_SIZE } from "@/lib/og/config";
import { getOgFonts } from "@/lib/og/fonts";
import { SeverityBadge } from "@/lib/og/severity-badge";
import { Wordmark } from "@/lib/og/wordmark";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Source evidence quote";
// eslint-disable-next-line unicorn/prefer-export-from -- Biome noBarrelFile blocks re-export from syntax
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function EvidenceOgImage({
  params,
}: // eslint-disable-next-line @typescript-eslint/naming-convention -- URL segment contains hyphen
Readonly<{ params: Promise<{ "quote-id": string }> }>) {
  const { "quote-id": quoteId } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("source_quotes")
    .select("verbatim_text, severity, source:sources(name)")
    .eq("id", quoteId)
    .single();

  /* eslint-disable @typescript-eslint/naming-convention */
  const text: string = (data as null | { verbatim_text?: string })?.verbatim_text ?? "";
  const severity: string = (data as null | { severity?: string })?.severity ?? "info";
  /* eslint-enable @typescript-eslint/naming-convention */
  const sourceArr = (data as null | { source?: { name?: string }[] })?.source;
  const sourceName: string = sourceArr?.[0]?.name ?? "Unknown source";

  const fonts = await getOgFonts(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#faf9f7",
        padding: 56,
        fontFamily: "Geist Sans",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            letterSpacing: "0.1em",
            fontFamily: "monospace",
          }}
        >
          SOURCE EVIDENCE
        </div>
        <div
          style={{
            fontSize: 28,
            fontFamily: "Source Serif 4",
            fontStyle: "italic",
            color: "#1f2937",
            lineHeight: 1.45,
            maxWidth: 1000,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {`“${text}”`}
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", fontFamily: "monospace" }}>
          — {sourceName}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <SeverityBadge level={severity} />
        <Wordmark />
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
