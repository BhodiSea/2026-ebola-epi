import "server-only";

import type { Metadata } from "next";
import { Suspense } from "react";

import { ActiveOutbreakBanner } from "@/components/outbreak/active-outbreak-banner";
import { OutbreakChoropleth } from "@/components/outbreak/outbreak-choropleth";
import { StatCard } from "@/components/outbreak/stat-card";
import { AiGeneratedLabel } from "@/components/provenance/ai-generated-label";
import type { DisagreementEntry, DisagreementsMap } from "@/lib/queries/case-counts";
import { getDisagreements, getSparkline14d, getStatTotals } from "@/lib/queries/case-counts";
import { getDailyBriefByDate } from "@/lib/queries/daily-briefs";
import type { Document } from "@/lib/queries/documents";
import { listRecentDocuments } from "@/lib/queries/documents";
import type { Outbreak } from "@/lib/queries/outbreaks";
import { getActiveOutbreak, listOutbreaks } from "@/lib/queries/outbreaks";

export const metadata: Metadata = {
  title: {
    absolute: "Bundibugyo Virus Outbreak 2026 — Ituri, DRC | Live Map & Source-Linked Data",
  },
  description:
    "Live headline figures, daily situation brief, and health-zone map for the 2026 Ituri Bundibugyo virus outbreak.",
  openGraph: {
    title: "Bundibugyo Virus Outbreak 2026 — Ituri, DRC | Live Map & Source-Linked Data",
    description:
      "Live confirmed cases, deaths, and CFR for the 2026 Ituri Bundibugyo virus outbreak.",
  },
};

export default async function TodayPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const viewMode = params.view === "table" ? "table" : "map";

  const outbreak = await getActiveOutbreak();

  if (outbreak === null) {
    return (
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <p className="font-mono text-[13px] text-fg-muted">No active outbreak detected.</p>
      </main>
    );
  }

  const { stats, sparkline, sitreps, allOutbreaks, disagreements, brief } = await loadTodayData(
    outbreak.id,
  );
  const sparklineValues = sparkline.map((p) => p.value);
  const confirmedQuoteId = stats.confirmed.quoteId ?? null;
  const deathsQuoteId = stats.deaths.quoteId ?? null;
  const cfrValue = stats.cfr === null ? "—" : `${stats.cfr.toFixed(1)}%`;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <ActiveOutbreakBanner outbreak={outbreak} confirmedQuoteId={confirmedQuoteId} />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Confirmed"
          value={stats.confirmed.value}
          quoteId={confirmedQuoteId}
          sparkline={sparklineValues}
          disagreements={pickDisagreements(disagreements, "confirmed")}
        />
        <StatCard
          label="Deaths"
          value={stats.deaths.value}
          quoteId={deathsQuoteId}
          disagreements={pickDisagreements(disagreements, "deaths")}
        />
        <StatCard label="CFR" value={cfrValue} quoteId={deathsQuoteId} />
        <StatCard label="Zones affected" value={stats.zonesAffected} quoteId={null} />
      </section>

      <DailyBriefSection brief={brief} />

      {/* Desktop: choropleth before recent docs */}
      <div className="hidden md:block">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-card" />}>
          <OutbreakChoropleth outbreakId={outbreak.id} viewMode={viewMode} />
        </Suspense>
      </div>

      <RecentDocsSection sitreps={sitreps} />

      {/* Mobile: choropleth after recent docs (feed-first) */}
      <div className="md:hidden">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-card" />}>
          <OutbreakChoropleth outbreakId={outbreak.id} viewMode={viewMode} />
        </Suspense>
      </div>

      <ActiveOutbreaksSection outbreaks={allOutbreaks} />
    </main>
  );
}

function ActiveOutbreaksSection({ outbreaks }: Readonly<{ outbreaks: Outbreak[] }>) {
  if (outbreaks.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] text-fg-muted uppercase tracking-wide">
        Active Outbreaks
      </h2>
      <div>
        {outbreaks.map((ob) => (
          <InlineOutbreakRow key={ob.id} outbreak={ob} />
        ))}
      </div>
    </section>
  );
}

function DailyBriefSection({
  brief,
}: Readonly<{ brief: Awaited<ReturnType<typeof getDailyBriefByDate>> }>) {
  if (brief === null) {
    return null;
  }
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-semibold">{brief.headline}</h2>
        <AiGeneratedLabel modelId={brief.modelId} reviewStatus="Editor-reviewed" />
      </div>
      <details>
        <summary className="cursor-pointer font-mono text-[12px] text-accent">
          Show situation report ▸
        </summary>
        <div className="mt-3 space-y-3">
          {brief.body.split("\n\n").map((para) => (
            <p
              key={para.slice(0, 40)}
              className="font-source-serif-4 text-[17px] text-fg leading-[1.55]"
            >
              {para}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}

function InlineOutbreakRow({ outbreak }: Readonly<{ outbreak: Outbreak }>) {
  const level = outbreak.severityLevel ?? "info";
  const levelColors: Record<string, string> = {
    alert: "text-alert",
    emergency: "text-emergency",
    info: "text-info",
    warn: "text-warn",
  };
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <div>
        <span className="font-semibold">
          {outbreak.name ?? outbreak.pathogenSlug ?? outbreak.pathogenIcd11}
        </span>
        <span className="ml-2 font-mono text-[12px] text-fg-muted">{outbreak.countryIso3}</span>
      </div>
      <span className={`font-mono text-[11px] uppercase ${levelColors[level] ?? "text-fg-muted"}`}>
        {level}
      </span>
    </div>
  );
}

async function loadTodayData(outbreakId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [stats, sparkline, sitreps, allOutbreaks, disagreements, brief] = await Promise.all([
    getStatTotals(outbreakId),
    getSparkline14d(outbreakId, "confirmed"),
    listRecentDocuments(5),
    listOutbreaks({ status: "active" }),
    getDisagreements(outbreakId),
    getDailyBriefByDate(today),
  ]);
  return { stats, sparkline, sitreps, allOutbreaks, disagreements, brief };
}

/** Return the disagreement entries for the most recent date that has multi-source conflict. */
function pickDisagreements(map: DisagreementsMap, metric: string): DisagreementEntry[] {
  for (const [key, entries] of map) {
    if (key.startsWith(`${metric}:`)) {
      return entries;
    }
  }
  return [];
}

function RecentDocsSection({ sitreps }: Readonly<{ sitreps: Document[] }>) {
  if (sitreps.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] text-fg-muted uppercase tracking-wide">
        Recent Documents
      </h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:flex-col md:gap-0 md:space-y-1 md:overflow-x-visible md:pb-0">
        {sitreps.map((doc) => (
          <div
            key={doc.id}
            className="flex min-w-[80vw] shrink-0 snap-start flex-col gap-1 rounded-md border border-border p-3 font-mono text-[13px] md:min-w-0 md:shrink md:flex-row md:items-baseline md:gap-2 md:rounded-none md:border-0 md:p-0"
          >
            <span className="shrink-0 text-fg-muted">{doc.source.name}</span>
            <span className="truncate">{doc.title ?? doc.url}</span>
            {doc.publishedAt === null ? null : (
              <span className="ml-auto shrink-0 text-fg-muted">
                {new Date(doc.publishedAt).toLocaleDateString("en", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
