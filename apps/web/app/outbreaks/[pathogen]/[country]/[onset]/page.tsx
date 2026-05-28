import "server-only";

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ActiveOutbreakBanner } from "@/components/outbreak/active-outbreak-banner";
import { ChoroplethStub } from "@/components/outbreak/choropleth-stub";
import { OutbreakHeader } from "@/components/outbreak/outbreak-header";
import { OutbreakTabs } from "@/components/outbreak/outbreak-tabs";
import { StatCard } from "@/components/outbreak/stat-card";
import { TimelineMulti } from "@/components/outbreak/timeline-multi";
import { AiGeneratedLabel } from "@/components/provenance/ai-generated-label";
import { SkeletonChart } from "@/components/provenance/skeleton-chart";
import { getOutbreakBrief } from "@/lib/copy/outbreak-briefs";
import type { SparklinePoint, StatTotals } from "@/lib/queries/case-counts";
import { getEpiCurveSeries, getStatTotals } from "@/lib/queries/case-counts";
import type { Document } from "@/lib/queries/documents";
import { getDocumentsForOutbreak } from "@/lib/queries/documents";
import { getOutbreakBySlug } from "@/lib/queries/outbreaks";

const FALLBACK_QUOTE_ID = "00000000-0000-0000-0000-000000000000";

interface BriefTabProps {
  brief: ReturnType<typeof getOutbreakBrief>;
  cfrLabel: string;
  confirmedQuoteId: string;
  deathsQuoteId: string;
  stats: StatTotals;
}

interface TabsInput {
  brief: ReturnType<typeof getOutbreakBrief>;
  cfrLabel: string;
  confirmedQuoteId: string;
  deathsQuoteId: string;
  documents: Document[];
  epiCurve: { confirmed: SparklinePoint[]; deaths: SparklinePoint[] };
  outbreakId: string;
  stats: StatTotals;
  viewMode: "map" | "table";
}

export default async function OutbreakDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ country: string; onset: string; pathogen: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { pathogen, country, onset } = await params;
  const qp = await searchParams;
  const viewMode = qp.view === "table" ? "table" : "map";

  const outbreak = await getOutbreakBySlug(pathogen, country.toUpperCase(), onset);
  if (outbreak === null) {
    notFound();
  }

  const [stats, epiCurve, documents] = await Promise.all([
    getStatTotals(outbreak.id),
    getEpiCurveSeries(outbreak.id),
    getDocumentsForOutbreak(outbreak.id),
  ]);

  const brief = getOutbreakBrief(pathogen, country, onset);
  const confirmedQuoteId = stats.confirmed.quoteId ?? FALLBACK_QUOTE_ID;
  const deathsQuoteId = stats.deaths.quoteId ?? FALLBACK_QUOTE_ID;
  const cfrLabel = stats.cfr === null ? "—" : `${stats.cfr.toFixed(1)}%`;
  const tabs = buildOutbreakTabs({
    brief,
    confirmedQuoteId,
    deathsQuoteId,
    cfrLabel,
    stats,
    epiCurve,
    documents,
    outbreakId: outbreak.id,
    viewMode,
  });

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <OutbreakHeader outbreak={outbreak} />
      <ActiveOutbreakBanner outbreak={outbreak} confirmedQuoteId={confirmedQuoteId} />
      <OutbreakTabs tabs={tabs} />
    </main>
  );
}

function BriefTabContent({
  brief,
  stats,
  confirmedQuoteId,
  deathsQuoteId,
  cfrLabel,
}: Readonly<BriefTabProps>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AiGeneratedLabel modelId="Hand-written by editor" reviewStatus="Editor-reviewed" />
      </div>
      {brief === null ? (
        <p className="font-mono text-[13px] text-fg-muted">No brief available yet.</p>
      ) : (
        <div className="space-y-3">
          {brief.body.map((para) => (
            <p key={para.slice(0, 40)} className="font-source-serif-4 text-[17px] leading-[1.55]">
              {para}
            </p>
          ))}
          <p className="font-mono text-[12px] text-fg-muted">{brief.context}</p>
        </div>
      )}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Confirmed" value={stats.confirmed.value} quoteId={confirmedQuoteId} />
        <StatCard label="Deaths" value={stats.deaths.value} quoteId={deathsQuoteId} />
        <StatCard label="CFR" value={cfrLabel} quoteId={confirmedQuoteId} />
        <StatCard label="Zones affected" value={stats.zonesAffected} quoteId={confirmedQuoteId} />
      </section>
    </div>
  );
}

function buildOutbreakTabs({
  brief,
  confirmedQuoteId,
  deathsQuoteId,
  cfrLabel,
  stats,
  epiCurve,
  documents,
  outbreakId,
  viewMode,
}: Readonly<TabsInput>) {
  return [
    {
      id: "brief",
      label: "Brief",
      content: (
        <BriefTabContent
          brief={brief}
          stats={stats}
          confirmedQuoteId={confirmedQuoteId}
          deathsQuoteId={deathsQuoteId}
          cfrLabel={cfrLabel}
        />
      ),
    },
    {
      id: "epi-curve",
      label: "Epi curve",
      content: (
        <Suspense fallback={<SkeletonChart />}>
          <TimelineMulti confirmedSeries={epiCurve.confirmed} deathsSeries={epiCurve.deaths} />
        </Suspense>
      ),
    },
    {
      id: "geography",
      label: "Geography",
      content: (
        <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-card" />}>
          <ChoroplethStub outbreakId={outbreakId} viewMode={viewMode} />
        </Suspense>
      ),
    },
    { id: "sources", label: "Sources", content: <SourcesTabContent documents={documents} /> },
    {
      id: "methods",
      label: "Methods",
      content: (
        <div className="space-y-2 font-mono text-[13px]">
          <p className="text-fg-muted">This page uses methods documented on the Methods page.</p>
          <a href="/methods#extraction" className="text-accent underline-offset-2 hover:underline">
            Extraction methodology →
          </a>
        </div>
      ),
    },
  ];
}

function SourcesTabContent({ documents }: Readonly<{ documents: Document[] }>) {
  if (documents.length === 0) {
    return <p className="font-mono text-[13px] text-fg-muted">No source documents indexed yet.</p>;
  }
  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{doc.title ?? doc.url}</span>
            <span className="shrink-0 font-mono text-[12px] text-fg-muted">{doc.source.name}</span>
          </div>
          {doc.publishedAt === null ? null : (
            <p className="mt-1 font-mono text-[12px] text-fg-muted">
              {new Date(doc.publishedAt).toLocaleDateString("en", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
