import { listEvalScores } from "@/lib/queries/eval-scores";
import { getProvenanceCoverageStats } from "@/lib/queries/provenance-stats";

interface KpiProps {
  readonly label: string;
  readonly tone?: "warn" | undefined;
  readonly value: string;
}

export default async function QualityPage() {
  const [evals, coverage] = await Promise.all([listEvalScores(), getProvenanceCoverageStats()]);
  const metrics = [...new Set(evals.map((r) => r.metric))];

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">
        Extraction Quality
      </h1>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] text-fg-muted uppercase tracking-wide">
          Provenance coverage
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi label="% verified offsets" value={`${coverage.percentVerified.toFixed(1)}%`} />
          <Kpi label="Published rows" value={coverage.totalPublished.toLocaleString()} />
          <Kpi
            label="Placeholder offsets"
            value={coverage.withPlaceholderOffsets.toLocaleString()}
            tone={coverage.withPlaceholderOffsets > 0 ? "warn" : undefined}
          />
          <Kpi
            label="Docs missing provenance"
            value={coverage.documentsMissingProvenance.toLocaleString()}
            tone={coverage.documentsMissingProvenance > 0 ? "warn" : undefined}
          />
        </div>
      </section>

      {evals.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">No eval data yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {metrics.map((m) => {
              const avg = avgScore(evals, m);
              return (
                <div key={m} className="rounded-md border border-border bg-bg p-4">
                  <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{m}</p>
                  <p className="mt-1 font-mono text-2xl tabular-nums">
                    {avg === null ? "—" : avg.toFixed(3)}
                  </p>
                </div>
              );
            })}
          </div>

          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-border border-b text-left text-fg-muted">
                <th className="pr-4 pb-1">Run</th>
                <th className="pr-4 pb-1">Metric</th>
                <th className="pr-4 pb-1">Source</th>
                <th className="pr-4 pb-1 text-right">Score</th>
                <th className="pb-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {evals.slice(0, 50).map((r) => (
                <tr key={`${r.run_id}:${r.metric}`} className="border-border/50 border-b">
                  <td className="py-1 pr-4 text-fg-subtle">{r.run_id.slice(0, 8)}&hellip;</td>
                  <td className="py-1 pr-4">{r.metric}</td>
                  <td className="py-1 pr-4 text-fg-muted">{r.source_slug ?? "—"}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{r.score.toFixed(3)}</td>
                  <td className="py-1 text-fg-muted">{r.evaluated_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function avgScore(scores: { metric: string; score: number }[], metric: string): null | number {
  const subset = scores.filter((r) => r.metric === metric);
  if (subset.length === 0) {
    return null;
  }
  return subset.reduce((s, r) => s + r.score, 0) / subset.length;
}

function Kpi({ label, tone, value }: KpiProps) {
  const border = tone === "warn" ? "border-amber-400" : "border-border";
  return (
    <div className={`rounded-md border ${border} bg-bg p-4`}>
      <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
