import { ImageResponse } from "@vercel/og";

import { OG_SIZE } from "@/lib/og/config";
import { getOgFonts } from "@/lib/og/fonts";
import { SeverityBadge } from "@/lib/og/severity-badge";
import { Wordmark } from "@/lib/og/wordmark";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Daily situation brief";
// eslint-disable-next-line unicorn/prefer-export-from -- Biome noBarrelFile blocks re-export from syntax
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function BriefOgImage({
  params,
}: Readonly<{ params: Promise<{ date: string }> }>) {
  const { date } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_briefs")
    .select("headline, body, severity")
    .eq("date", date)
    .single();

  const headline: string = (data as null | { headline?: string })?.headline ?? "Daily Brief";
  const severity: string = (data as null | { severity?: string })?.severity ?? "info";
  const body: string = (data as null | { body?: string })?.body ?? "";
  const firstBullet = body.split("\n\n")[0] ?? "";
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            fontSize: 13,
            color: "#6b7280",
            letterSpacing: "0.1em",
            fontFamily: "monospace",
          }}
        >
          DAILY BRIEF · {date}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#111827", lineHeight: 1.15 }}>
          {headline}
        </div>
        {firstBullet.length > 0 ? (
          <div
            style={{
              fontSize: 22,
              color: "#374151",
              lineHeight: 1.5,
              maxWidth: 980,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {firstBullet}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <SeverityBadge level={severity} />
        <Wordmark />
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
