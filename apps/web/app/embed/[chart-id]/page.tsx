import { EmbedShell } from "./embed-shell";
import { ChoroplethStub } from "@/components/outbreak/choropleth-stub";
import { TimelineMulti } from "@/components/outbreak/timeline-multi";
import { getEpiCurveSeries } from "@/lib/queries/case-counts";
import { getActiveOutbreak, getOutbreakById } from "@/lib/queries/outbreaks";

const KNOWN_CHART_IDS = new Set(["cfr-trend", "epi-curve", "zone-map"]);

export default async function EmbedPage({
  params,
  searchParams,
}: Readonly<{
  // eslint-disable-next-line @typescript-eslint/naming-convention -- URL segment contains hyphen
  params: Promise<{ "chart-id": string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { "chart-id": chartId } = await params;
  const sp = await searchParams;
  const initialTheme = sp.theme === "dark" ? "dark" : "light";
  const outbreakIdParam = typeof sp.outbreak_id === "string" ? sp.outbreak_id : undefined;

  if (!KNOWN_CHART_IDS.has(chartId)) {
    return <EmbedShell initialTheme={initialTheme} chartId={chartId} />;
  }

  const outbreak =
    outbreakIdParam === undefined
      ? await getActiveOutbreak()
      : await getOutbreakById(outbreakIdParam);

  if (outbreak === null) {
    return <EmbedShell initialTheme={initialTheme} chartId={chartId} />;
  }

  if (chartId === "zone-map") {
    return (
      <EmbedShell initialTheme={initialTheme} chartId={chartId}>
        <ChoroplethStub outbreakId={outbreak.id} />
      </EmbedShell>
    );
  }

  // epi-curve and cfr-trend both use the epi series
  const { confirmed, deaths } = await getEpiCurveSeries(outbreak.id);

  if (chartId === "cfr-trend") {
    const cfrSeries = confirmed
      .map((c, i) => {
        const d = deaths[i];
        if (d === undefined || c.value === 0) {
          return null;
        }
        return { date: c.date, value: Number(((d.value / c.value) * 100).toFixed(1)) };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return (
      <EmbedShell initialTheme={initialTheme} chartId={chartId}>
        <TimelineMulti confirmedSeries={cfrSeries} deathsSeries={[]} ariaLabel="CFR trend" />
      </EmbedShell>
    );
  }

  return (
    <EmbedShell initialTheme={initialTheme} chartId={chartId}>
      <TimelineMulti confirmedSeries={confirmed} deathsSeries={deaths} ariaLabel="Epi curve" />
    </EmbedShell>
  );
}
