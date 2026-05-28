import { Figure } from "@/components/provenance/figure";
import { SeverityPill } from "@/components/provenance/severity-pill";
import { getStatTotals } from "@/lib/queries/case-counts";
import type { Outbreak } from "@/lib/queries/outbreaks";

interface OutbreakRowProps {
  lastUpdate?: string;
  outbreak: Outbreak;
  sparkline?: number[];
}

type SeverityLevel = "alert" | "emergency" | "info" | "warn";

function daysSinceOnset(onsetDate: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(onsetDate).getTime()) / 86_400_000));
}

async function OutbreakRow({ outbreak, sparkline, lastUpdate }: Readonly<OutbreakRowProps>) {
  const stats = await getStatTotals(outbreak.id);
  const days = daysSinceOnset(outbreak.onsetDate);
  const level = toSeverityLevel(outbreak.severityLevel);
  const cfrLabel = stats.cfr === null ? "—" : `${stats.cfr.toFixed(1)}%`;
  const FALLBACK_QUOTE_ID = "00000000-0000-0000-0000-000000000000";
  const confirmedQuoteId = stats.confirmed.quoteId ?? FALLBACK_QUOTE_ID;
  const deathsQuoteId = stats.deaths.quoteId ?? FALLBACK_QUOTE_ID;

  return (
    <a
      href={`/outbreaks/${outbreak.pathogenSlug ?? outbreak.pathogenIcd11}/${outbreak.countryIso3.toLowerCase()}/${outbreak.onsetDate}`}
      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-card/80"
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <SeverityPill level={level} label={level.toUpperCase()} />
          <span className="font-semibold">
            {outbreak.name ?? outbreak.pathogenSlug ?? outbreak.pathogenIcd11}
          </span>
        </div>
        <span className="font-mono text-[12px] text-fg-muted">
          {outbreak.countryIso3} · Day {days}
          {lastUpdate === undefined ? null : ` · Updated ${lastUpdate}`}
        </span>
      </div>
      <div className="flex items-center gap-6 font-mono text-[13px]">
        {sparkline !== undefined && sparkline.length >= 2 ? (
          <svg viewBox="0 0 60 20" className="h-5 w-15" aria-hidden="true">
            <polyline
              points={sparkline
                .map((v, i) => {
                  const max = Math.max(...sparkline);
                  const min = Math.min(...sparkline);
                  const range = max === min ? 1 : max - min;
                  const x = (i / (sparkline.length - 1)) * 60;
                  const y = 20 - ((v - min) / range) * 20;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              className="stroke-current"
              strokeWidth="1.5"
            />
          </svg>
        ) : null}
        <div className="text-right">
          <div className="text-[11px] text-fg-muted uppercase">Confirmed</div>
          <div data-numeric>
            <Figure value={stats.confirmed.value} quoteId={confirmedQuoteId} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-fg-muted uppercase">CFR</div>
          <div data-numeric>
            <Figure value={cfrLabel} quoteId={deathsQuoteId} />
          </div>
        </div>
      </div>
    </a>
  );
}

function toSeverityLevel(raw: null | string): SeverityLevel {
  if (raw === "emergency" || raw === "alert" || raw === "warn") {
    return raw;
  }
  return "info";
}

export { OutbreakRow };
