import { DisagreementPill } from "@/components/outbreak/disagreement-pill";
import { Figure } from "@/components/provenance/figure";
import type { DisagreementEntry } from "@/lib/queries/case-counts";

interface StatCardProps {
  deltaPct?: number;
  disagreements?: DisagreementEntry[];
  label: string;
  quoteId: string;
  sparkline?: number[];
  value: number | string;
}

function buildSparklinePath(data: readonly number[]): string {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max === min ? 1 : max - min;
  const pts = data.map((v, i) => {
    const x = ((i / (data.length - 1)) * 100).toFixed(1);
    const y = (24 - ((v - min) / range) * 24).toFixed(1);
    return `${x},${y}`;
  });
  return `M ${pts.join(" L ")}`;
}

function StatCard({
  label,
  value,
  quoteId,
  deltaPct,
  sparkline,
  disagreements,
}: Readonly<StatCardProps>) {
  return (
    <div
      data-stat-card={label.toLowerCase()}
      className="flex flex-col gap-2 rounded-lg border bg-card p-4"
    >
      <p className="font-mono text-[12px] text-fg-muted uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-semibold text-3xl tabular-nums">
          <Figure value={value} quoteId={quoteId} />
        </p>
        {disagreements !== undefined && disagreements.length > 0 ? (
          <DisagreementPill count={disagreements.length} entries={disagreements} />
        ) : null}
      </div>
      {deltaPct === undefined ? null : (
        <p data-numeric className="font-mono text-[12px] text-fg-muted">
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(1)}%
        </p>
      )}
      {sparkline !== undefined && sparkline.length >= 2 ? (
        <svg viewBox="0 0 100 24" className="mt-1 h-6 w-full" aria-hidden="true">
          <path
            d={buildSparklinePath(sparkline)}
            fill="none"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </div>
  );
}

export { StatCard };
