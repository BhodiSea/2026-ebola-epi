"use client";

import { RetryButton } from "@/components/internal/retry-button";

/* eslint-disable @typescript-eslint/naming-convention */
export interface InngestRun {
  ended_at: null | string;
  function_id: string;
  run_id: string;
  started_at: string;
  status: "Cancelled" | "Completed" | "Failed" | "Running";
}
/* eslint-enable @typescript-eslint/naming-convention */

const STATUS_BAR_CLASSES: Record<string, string> = {
  Cancelled: "bg-fg-subtle/40",
  Completed: "bg-fg/40",
  Failed: "bg-emergency",
  Running: "bg-warn motion-safe:animate-pulse",
};

export function PipelineGantt({ runs }: Readonly<{ runs: InngestRun[] }>) {
  if (runs.length === 0) {
    return null;
  }

  const { start: windowStart, end: windowEnd } = computeWindow(runs);
  const windowDuration = windowEnd - windowStart;

  return (
    <ul className="space-y-1" aria-label="Pipeline run timeline">
      {runs.map((run) => {
        const { left, width } = barGeometry(run, windowStart, windowDuration);
        const barClass = STATUS_BAR_CLASSES[run.status] ?? "bg-fg-subtle/40";
        const durationMs =
          run.ended_at === null
            ? null
            : new Date(run.ended_at).getTime() - new Date(run.started_at).getTime();
        const durationLabel =
          durationMs === null ? "running" : `${(durationMs / 1000).toFixed(1)}s`;
        const shortFn = run.function_id.split("/")[1] ?? run.function_id;

        return (
          <li key={run.run_id} className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate font-mono text-[10px] text-fg-muted">
              {shortFn}
            </span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-border/30">
              <div
                role="img"
                className={`absolute h-full rounded-sm ${barClass}`}
                style={{ left, width }}
                aria-label={`${run.status}: ${run.function_id} — ${durationLabel}`}
                title={`${run.function_id} · ${run.run_id} · ${durationLabel}`}
              />
            </div>
            {run.status === "Failed" ? <RetryButton runId={run.run_id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

function barGeometry(
  run: InngestRun,
  windowStart: number,
  windowDuration: number,
): { left: string; width: string } {
  const runStart = new Date(run.started_at).getTime();
  const runEnd =
    run.ended_at === null ? windowStart + windowDuration : new Date(run.ended_at).getTime();
  const leftPct = ((runStart - windowStart) / windowDuration) * 100;
  const widthPct = ((runEnd - runStart) / windowDuration) * 100;
  return {
    left: `${Math.max(0, leftPct).toFixed(2)}%`,
    width: `${Math.max(1, widthPct).toFixed(2)}%`,
  };
}

function computeWindow(runs: InngestRun[]): { end: number; start: number } {
  const starts = runs.map((r) => new Date(r.started_at).getTime());
  const ends = runs.flatMap((r) => (r.ended_at === null ? [] : [new Date(r.ended_at).getTime()]));
  const start = Math.min(...starts);
  const end = ends.length > 0 ? Math.max(...ends) : start + 60_000;
  return { start, end: end > start ? end : start + 60_000 };
}
