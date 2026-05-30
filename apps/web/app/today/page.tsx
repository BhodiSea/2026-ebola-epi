import "server-only";

import { Suspense } from "react";

import { ActiveOutbreakBanner } from "@/components/outbreak/active-outbreak-banner";
import { ChoroplethStub } from "@/components/outbreak/choropleth-stub";
import { StatCard } from "@/components/outbreak/stat-card";
import { AiGeneratedLabel } from "@/components/provenance/ai-generated-label";
import { DAILY_BRIEF } from "@/lib/copy/daily-brief";
import type { DisagreementEntry, DisagreementsMap } from "@/lib/queries/case-counts";
import { getDisagreements, getSparkline14d, getStatTotals } from "@/lib/queries/case-counts";
import type { Document } from "@/lib/queries/documents";
import { listRecentDocuments } from "@/lib/queries/documents";
import type { Outbreak } from "@/lib/queries/outbreaks";
import { getActiveOutbreak, listOutbreaks } from "@/lib/queries/outbreaks";

const PLACEHOLDER_QUOTE_ID = "00000000-0000-0000-0000-000000000000";

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

  const { stats, sparkline, sitreps, allOutbreaks, disagreements } = await loadTodayData(
    outbreak.id,
  );
  const sparklineValues = sparkline.map((p) => p.value);
  const confirmedQuoteId = stats.confirmed.quoteId ?? PLACEHOLDER_QUOTE_ID;
  const deathsQuoteId = stats.deaths.quoteId ?? PLACEHOLDER_QUOTE_ID;
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
        <StatCard label="CFR" value={cfrValue} quoteId={confirmedQuoteId} />
        <StatCard label="Zones affected" value={stats.zonesAffected} quoteId={confirmedQuoteId} />
      </section>

      <DailyBriefSection />

      <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-card" />}>
        <ChoroplethStub outbreakId={outbreak.id} viewMode={viewMode} />
      </Suspense>

      <RecentDocsSection sitreps={sitreps} />
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

function DailyBriefSection() {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-semibold">{DAILY_BRIEF.headline}</h2>
        <AiGeneratedLabel modelId="Hand-written by editor" reviewStatus="Editor-reviewed" />
      </div>
      <details>
        <summary className="cursor-pointer font-mono text-[12px] text-accent">
          Show situation report ▸
        </summary>
        <div className="mt-3 space-y-3">
          {DAILY_BRIEF.body.map((para) => (
            <p
              key={para.slice(0, 40)}
              className="font-source-serif-4 text-[17px] text-fg leading-[1.55]"
            >
              {para}
            </p>
          ))}
          <p className="font-mono text-[12px] text-fg-muted">{DAILY_BRIEF.context}</p>
        </div>
      </details>
    </section>
  );
}

function InlineOutbreakRow({ outbreak }: Readonly<{ outbreak: Outbreak }>) {
  const level = outbreak.severityLevel ?? "info";
  const levelColors: Record<string, string> = {
    emergency: "text-emergency",
    alert: "text-alert",
    warn: "text-warn",
    info: "text-info",
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
  const [stats, sparkline, sitreps, allOutbreaks, disagreements] = await Promise.all([
    getStatTotals(outbreakId),
    getSparkline14d(outbreakId, "confirmed"),
    listRecentDocuments(5),
    listOutbreaks({ status: "active" }),
    getDisagreements(outbreakId),
  ]);
  return { stats, sparkline, sitreps, allOutbreaks, disagreements };
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
      <div className="space-y-1">
        {sitreps.map((doc) => (
          <div key={doc.id} className="flex items-baseline gap-2 font-mono text-[13px]">
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
