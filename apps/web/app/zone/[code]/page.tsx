import type { Metadata } from "next";

import { FigureOrMissing } from "@/components/provenance/figure-or-missing";
import { JsonLd } from "@/components/seo/json-ld";
import type { Document } from "@/lib/queries/documents";
import { getDocumentsForZone } from "@/lib/queries/documents";
import { getActiveOutbreak } from "@/lib/queries/outbreaks";
import { getZoneStatTotals } from "@/lib/queries/zone-detail";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `${code} Health Zone — BDBV Case Data | ituri-sitrep`,
    description: `Bundibugyo virus case counts and source documents for the ${code} health zone.`,
  };
}

export default async function ZonePage({
  params,
}: Readonly<{ params: Promise<{ code: string }> }>) {
  const { code } = await params;

  const outbreak = await getActiveOutbreak();

  if (outbreak === null) {
    return (
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <p className="font-mono text-[13px] text-fg-muted">No active outbreak.</p>
      </main>
    );
  }

  const [stats, docs] = await Promise.all([
    getZoneStatTotals(outbreak.id, code, "all"),
    getDocumentsForZone(outbreak.id, code),
  ]);

  const confirmedQuoteId = stats.confirmed.quoteId ?? null;
  const deathsQuoteId = stats.deaths.quoteId ?? null;
  const cfrValue = stats.cfr === null ? "—" : `${stats.cfr.toFixed(1)}%`;

  const breadcrumbs = buildBreadcrumbs([
    { label: "Home", path: "/" },
    { label: "Zones", path: "/outbreaks" },
    { label: `${code} Health Zone`, path: `/zone/${code}` },
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <JsonLd schema={breadcrumbs} />
      <header className="space-y-1">
        <p className="font-mono text-[11px] text-fg-muted uppercase tracking-wide">Health Zone</p>
        <h1 className="font-semibold text-2xl">{code}</h1>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-bg p-4">
          <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">Confirmed</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            <FigureOrMissing quoteId={confirmedQuoteId} value={stats.confirmed.value} />
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg p-4">
          <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">Deaths</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            <FigureOrMissing quoteId={deathsQuoteId} value={stats.deaths.value} />
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg p-4">
          <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">CFR</p>
          <p className="mt-1 font-semibold text-2xl tabular-nums">
            <FigureOrMissing quoteId={confirmedQuoteId} value={cfrValue} />
          </p>
        </div>
      </section>

      {stats.firstDetected.value === null ? null : (
        <p className="font-mono text-[12px] text-fg-muted">
          First detected: {stats.firstDetected.value}
        </p>
      )}

      <ZoneDocs docs={docs} />
    </main>
  );
}

function ZoneDocs({ docs }: Readonly<{ docs: Document[] }>) {
  if (docs.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] text-fg-muted uppercase tracking-wide">
        Source Documents
      </h2>
      <div className="space-y-1">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-baseline gap-2 border-border border-b py-1.5 font-mono text-[13px] last:border-0"
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
