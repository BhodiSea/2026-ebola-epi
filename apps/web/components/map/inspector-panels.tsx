"use client";

import { TimelineMulti } from "@/components/outbreak/timeline-multi";
import { FigureInteractive } from "@/components/provenance/figure-interactive";
import type { SeverityLevel } from "@/components/provenance/severity-pill";
import { SeverityPill } from "@/components/provenance/severity-pill";
import { buildChartAltText } from "@/lib/a11y/alt-text";
import type {
  ZoneDateFigure,
  ZoneDetailResponse,
  ZoneDocumentDto,
  ZoneFigure,
  ZoneRawRowDto,
} from "@/lib/map/zone-detail-response";

export function OverviewPanel({
  zoneName,
  totals,
  sourceCount,
}: Readonly<{
  sourceCount: number;
  totals: ZoneDetailResponse["totals"];
  zoneName: string;
}>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-base">{zoneName}</h2>
        <SeverityPill level={severityFor(totals.confirmed.value)} label="Health zone" />
      </div>

      <div>
        <StatRow label="Confirmed" figure={totals.confirmed} />
        <StatRow label="Deaths" figure={totals.deaths} />
        <div className="flex items-baseline justify-between py-1.5">
          <span className="font-mono text-[11px] text-[var(--color-fg-subtle)] uppercase tracking-wide">
            CFR (derived)
          </span>
          <span data-numeric="" className="font-semibold text-lg tabular-nums">
            <CfrValue cfr={totals.cfr} deaths={totals.deaths} />
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[var(--color-fg-subtle)] text-xs">First detected</dt>
          <dd className="font-mono">
            <ZoneDateValue figure={totals.firstDetected} />
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-fg-subtle)] text-xs">Source agreement</dt>
          <dd className="font-mono">{sourceAgreementLabel(sourceCount)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function RawPanel({ rawRows }: Readonly<{ rawRows: ZoneRawRowDto[] }>) {
  return (
    <pre className="overflow-auto rounded bg-[var(--color-surface-2)] p-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(rawRows, null, 2)}
    </pre>
  );
}

export function SourcesPanel({ documents }: Readonly<{ documents: ZoneDocumentDto[] }>) {
  if (documents.length === 0) {
    return <p className="text-[var(--color-fg-subtle)] text-sm">No contributing documents.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="border-[var(--color-border)] border-b pb-2 text-sm">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
          >
            {doc.title ?? doc.url}
          </a>
          <p className="font-mono text-[11px] text-[var(--color-fg-subtle)]">
            {doc.source.name} · {doc.publishedAt ?? "n.d."} · {doc.source.licenseTier}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function TimelinePanel({ series }: Readonly<{ series: ZoneDetailResponse["series"] }>) {
  if (series.confirmed.length === 0 && series.deaths.length === 0) {
    return <p className="text-[var(--color-fg-subtle)] text-sm">No time series for this zone.</p>;
  }
  return (
    <TimelineMulti
      confirmedSeries={series.confirmed}
      deathsSeries={series.deaths}
      ariaLabel={buildChartAltText({
        elementType: "timeline",
        scope: "this health zone",
        variable: "confirmed cases and deaths",
        asOf: "latest available",
      })}
    />
  );
}

/** CFR is derived from deaths/confirmed; attribute it to the deaths quote (the convention
 *  established in outbreak-row.tsx) so the derived figure still carries provenance. Hard rule #2
 *  is absolute: never render the bare percentage without a resolved quote — show "—" instead. */
function CfrValue({ cfr, deaths }: Readonly<{ cfr: null | number; deaths: ZoneFigure }>) {
  if (cfr === null || deaths.quote === null || deaths.description === null) {
    return <>—</>;
  }
  return (
    <FigureInteractive value={`${cfr}%`} quote={deaths.quote} description={deaths.description} />
  );
}

function severityFor(confirmed: number): SeverityLevel {
  if (confirmed >= 100) {
    return "emergency";
  }
  if (confirmed >= 50) {
    return "alert";
  }
  if (confirmed >= 10) {
    return "warn";
  }
  return "info";
}

function sourceAgreementLabel(sourceCount: number): string {
  if (sourceCount === 0) {
    return "no sources";
  }
  if (sourceCount === 1) {
    return "single source";
  }
  return `${sourceCount} sources`;
}

function StatRow({ label, figure }: Readonly<{ figure: ZoneFigure; label: string }>) {
  return (
    <div className="flex items-baseline justify-between border-[var(--color-border)] border-b py-1.5">
      <span className="font-mono text-[11px] text-[var(--color-fg-subtle)] uppercase tracking-wide">
        {label}
      </span>
      <span className="font-semibold text-lg tabular-nums">
        <ZoneFigureValue figure={figure} />
      </span>
    </div>
  );
}

/** First-detected is a factual date derived from the earliest confirmed row; render it through
 *  its source quote (hard rule #2), falling back to a bare value only when no quote resolved. */
function ZoneDateValue({ figure }: Readonly<{ figure: ZoneDateFigure }>) {
  if (figure.value === null) {
    return <>—</>;
  }
  if (figure.quote === null || figure.description === null) {
    return <span data-numeric="">{figure.value}</span>;
  }
  return (
    <FigureInteractive value={figure.value} quote={figure.quote} description={figure.description} />
  );
}

/** Render a numeric figure through its provenance quote (hard rule #2). Falls back to a
 *  plain value only when no quote resolved — case_counts.source_quote_id is NOT NULL, so
 *  this fallback should be unreachable for real published rows. */
function ZoneFigureValue({ figure }: Readonly<{ figure: ZoneFigure }>) {
  if (figure.quote === null || figure.description === null) {
    return <span data-numeric="">{figure.value}</span>;
  }
  return (
    <FigureInteractive value={figure.value} quote={figure.quote} description={figure.description} />
  );
}
