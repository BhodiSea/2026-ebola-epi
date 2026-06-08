import type { InngestRun } from "@/components/internal/pipeline-gantt";
import { PipelineGantt } from "@/components/internal/pipeline-gantt";
import { RetryButton } from "@/components/internal/retry-button";
import { env } from "@/lib/env";

const STATUS_COLORS: Record<string, string> = {
  Cancelled: "text-fg-muted",
  Completed: "text-fg",
  Failed: "text-emergency",
  Running: "text-warn",
};

export default async function PipelinePage() {
  const runs = await fetchRuns();
  const successRate = computeSuccessRate(runs);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-baseline gap-4">
        <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">Pipeline</h1>
        {runs.length > 0 ? <SuccessRatePill rate={successRate} /> : null}
      </div>

      {runs.length === 0 ? (
        <p className="font-mono text-fg-muted text-xs">No runs found.</p>
      ) : (
        <>
          <PipelineGantt runs={runs} />
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-border border-b text-left text-fg-muted">
                <th className="pr-4 pb-1">Function</th>
                <th className="pr-4 pb-1">Status</th>
                <th className="pr-4 pb-1">Started</th>
                <th className="pr-4 pb-1">Duration</th>
                <th className="pr-4 pb-1">Run ID</th>
                <th className="pb-1" />
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.run_id} className="border-border/50 border-b">
                  <td className="py-1 pr-4">{run.function_id}</td>
                  <td className={`py-1 pr-4 ${STATUS_COLORS[run.status] ?? "text-fg-muted"}`}>
                    {run.status}
                  </td>
                  <td className="py-1 pr-4 text-fg-muted">{run.started_at.slice(0, 16)}</td>
                  <td className="py-1 pr-4 text-fg-muted tabular-nums">
                    {formatDuration(run.started_at, run.ended_at)}
                  </td>
                  <td className="py-1 pr-4 text-fg-subtle">{run.run_id.slice(0, 12)}&hellip;</td>
                  <td className="py-1">
                    {run.status === "Failed" ? <RetryButton runId={run.run_id} /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function computeSuccessRate(runs: InngestRun[]): number {
  if (runs.length === 0) {
    return 0;
  }
  const completed = runs.filter((r) => r.status === "Completed").length;
  return completed / runs.length;
}

async function fetchRuns(): Promise<InngestRun[]> {
  try {
    const res = await fetch("https://api.inngest.com/v1/runs?limit=100", {
      headers: { Authorization: `Bearer ${env.INNGEST_API_KEY ?? ""}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      console.error(`[pipeline] Inngest API returned ${res.status}`);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
    const body = (await res.json()) as unknown as { data?: InngestRun[] };
    return body.data ?? [];
  } catch (error) {
    console.error("[pipeline] Failed to fetch Inngest runs:", error);
    return [];
  }
}

function formatDuration(startedAt: string, endedAt: null | string): string {
  if (endedAt === null) {
    return "—";
  }
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) {
    return "—";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m${seconds}s`;
}

function successRateColour(rate: number): string {
  if (rate >= 0.95) {
    return "bg-green-100 text-green-800";
  }
  if (rate >= 0.8) {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-red-100 text-red-800";
}

function SuccessRatePill({ rate }: Readonly<{ rate: number }>) {
  const pct = Math.round(rate * 100);
  const colour = successRateColour(rate);
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] ${colour}`}>{pct}% success</span>
  );
}
