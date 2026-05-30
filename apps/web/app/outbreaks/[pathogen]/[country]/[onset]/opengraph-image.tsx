import { ImageResponse } from "@vercel/og";

import { OG_SIZE } from "@/lib/og/config";
import { getOgFonts } from "@/lib/og/fonts";
import { SeverityBadge } from "@/lib/og/severity-badge";
import { Wordmark } from "@/lib/og/wordmark";
import { getStatTotals } from "@/lib/queries/case-counts";
import { getOutbreakBySlug } from "@/lib/queries/outbreaks";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Outbreak situation report";
// eslint-disable-next-line unicorn/prefer-export-from -- Biome noBarrelFile blocks re-export from syntax
export const size = OG_SIZE;
export const contentType = "image/png";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function OutbreakOgImage({
  params,
}: Readonly<{ params: Promise<{ country: string; onset: string; pathogen: string }> }>) {
  const { pathogen, country, onset } = await params;

  const outbreak = await getOutbreakBySlug(pathogen, country.toUpperCase(), onset);
  const name = outbreak?.name ?? pathogen;
  const severity = outbreak?.severityLevel ?? "info";
  const totals = outbreak === null ? null : await getStatTotals(outbreak.id);
  const confirmed = totals?.confirmed.value ?? 0;
  const deaths = totals?.deaths.value ?? 0;
  const sourceLabel = outbreak === null ? "" : await fetchSourceLabel(outbreak.id);
  const fonts = await getOgFonts(SITE_URL);

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
          {country.toUpperCase()} · {onset}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}>
          {name}
        </div>
        <SeverityBadge level={severity} />
      </div>

      <OgStats confirmed={confirmed} deaths={deaths} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sourceLabel ? (
          <div style={{ fontSize: 14, color: "#6b7280", fontFamily: "monospace" }}>
            {sourceLabel}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Wordmark />
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}

async function fetchSourceLabel(outbreakId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("published_at, source:sources(name)")
    .eq("outbreak_id", outbreakId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Supabase returns snake_case columns
  const doc = data as null | { published_at?: string; source?: { name?: string }[] };
  const sourceName = doc?.source?.[0]?.name ?? "";
  if (sourceName === "") {
    return "";
  }
  const rawDate = doc?.published_at;
  const month =
    rawDate === undefined
      ? ""
      : new Date(rawDate).toLocaleDateString("en", { month: "short", year: "numeric" });
  return month ? `Source: ${sourceName}, ${month}` : `Source: ${sourceName}`;
}

function OgStats({ confirmed, deaths }: Readonly<{ confirmed: number; deaths: number }>) {
  return (
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
  );
}
