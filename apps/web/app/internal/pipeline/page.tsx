import { env } from "@/lib/env";

/* eslint-disable @typescript-eslint/naming-convention */
interface InngestRun {
  ended_at: null | string;
  function_id: string;
  run_id: string;
  started_at: string;
  status: "Cancelled" | "Completed" | "Failed" | "Running";
}
/* eslint-enable @typescript-eslint/naming-convention */

const STATUS_COLORS: Record<string, string> = {
  Cancelled: "text-fg-muted",
  Completed: "text-fg",
  Failed: "text-emergency",
  Running: "text-warn",
};

export default async function PipelinePage() {
  const runs = await fetchRuns();

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">Pipeline</h1>

      {runs.length === 0 ? (
        <p className="font-mono text-fg-muted text-xs">
          No runs found. Verify INNGEST_SIGNING_KEY is set.
        </p>
      ) : (
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-border border-b text-left text-fg-muted">
              <th className="pr-4 pb-1">Function</th>
              <th className="pr-4 pb-1">Status</th>
              <th className="pr-4 pb-1">Started</th>
              <th className="pb-1">Run ID</th>
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
                <td className="py-1 text-fg-subtle">{run.run_id.slice(0, 12)}&hellip;</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

async function fetchRuns(): Promise<InngestRun[]> {
  const key = env.INNGEST_SIGNING_KEY;

  try {
    const res = await fetch("https://api.inngest.com/v1/runs?limit=100", {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
    const body = (await res.json()) as unknown as { data?: InngestRun[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}
