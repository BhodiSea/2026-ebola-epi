import { ImageResponse } from "@vercel/og";

import { OG_SIZE } from "@/lib/og/config";
import { getOgFonts } from "@/lib/og/fonts";
import { SeverityBadge } from "@/lib/og/severity-badge";
import { Wordmark } from "@/lib/og/wordmark";
import { getActiveOutbreak } from "@/lib/queries/outbreaks";
import { getZoneStatTotals } from "@/lib/queries/zone-detail";

export const runtime = "edge";
export const alt = "Health zone situation report";
// eslint-disable-next-line unicorn/prefer-export-from -- Biome noBarrelFile blocks re-export from syntax
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ZoneOgImage({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;

  const outbreak = await getActiveOutbreak();
  const stats = outbreak === null ? null : await getZoneStatTotals(outbreak.id, code, "all");

  const confirmed = stats?.confirmed.value ?? 0;
  const deaths = stats?.deaths.value ?? 0;
  const severity = outbreak?.severityLevel ?? "info";
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
          HEALTH ZONE
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
          {code}
        </div>
        <SeverityBadge level={severity} />
      </div>

      <div style={{ display: "flex", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "monospace" }}>CONFIRMED</div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "#111827",
            }}
          >
            {confirmed}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 13, color: "#6b7280", fontFamily: "monospace" }}>DEATHS</div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "#111827",
            }}
          >
            {deaths}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Wordmark />
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
