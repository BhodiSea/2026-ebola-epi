import { listEvalScores } from "@/lib/queries/eval-scores";

export default async function QualityPage() {
  const evals = await listEvalScores();

  const metrics = [...new Set(evals.map((r) => r.metric))];

  function avgScore(metric: string) {
    const subset = evals.filter((r) => r.metric === metric);
    if (subset.length === 0) {
      return null;
    }
    return subset.reduce((s, r) => s + r.score, 0) / subset.length;
  }

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">
        Extraction Quality
      </h1>

      {evals.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">No eval data yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {metrics.map((m) => {
              const avg = avgScore(m);
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
