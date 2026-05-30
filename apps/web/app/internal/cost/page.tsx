import { CostDailyArea } from "@/components/internal/cost-daily-area";
import { createClient } from "@/lib/supabase/server";

export interface DailyPoint {
  cost: number;
  day: string;
}

/* eslint-disable @typescript-eslint/naming-convention */
interface UsageRow {
  cost_usd: null | number;
  input_tokens: number;
  logged_at: string;
  model_id: string;
  output_tokens: number;
}
/* eslint-enable @typescript-eslint/naming-convention */

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function CostPage() {
  // eslint-disable-next-line react-hooks/purity -- Server Component runs once per request; Date.now() is safe
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const supabase = await createClient();

  const [{ data: usageRows }, { count: runCount }] = await Promise.all([
    supabase
      .from("anthropic_usage_log")
      .select("logged_at, model_id, input_tokens, output_tokens, cost_usd")
      .gte("logged_at", cutoff)
      .order("logged_at", { ascending: false })
      .limit(500),
    supabase
      .from("extraction_runs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff),
  ]);

  const log = (usageRows ?? []) as UsageRow[];
  const total30d = log.reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const costPerRun = (runCount ?? 0) > 0 ? total30d / (runCount ?? 1) : 0;

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const totalToday = log
    .filter((r) => r.logged_at.startsWith(todayPrefix))
    .reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const topOutliers = [...log].sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0)).slice(0, 10);
  const dailySeries = buildDailySeries(log);

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">LLM Cost</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Today" value={`$${totalToday.toFixed(2)}`} />
        <KpiCard label="30-day" value={`$${total30d.toFixed(2)}`} />
        <KpiCard label="Runs" value={String(runCount ?? 0)} />
        <KpiCard label="$/extraction" value={`$${costPerRun.toFixed(4)}`} />
      </div>

      {dailySeries.length > 0 ? (
        <section>
          <h2 className="mb-3 font-mono text-fg-muted text-xs uppercase tracking-wide">
            Daily Spend (30d)
          </h2>
          <CostDailyArea data={dailySeries} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-mono text-fg-muted text-xs uppercase tracking-wide">
          Top 10 Outliers
        </h2>
        {topOutliers.length === 0 ? (
          <p className="font-mono text-fg-muted text-xs">No data yet.</p>
        ) : (
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-border border-b text-left text-fg-muted">
                <th className="pr-4 pb-1">Time</th>
                <th className="pr-4 pb-1">Model</th>
                <th className="pr-4 pb-1 text-right">In</th>
                <th className="pr-4 pb-1 text-right">Out</th>
                <th className="pb-1 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {topOutliers.map((r) => (
                <tr key={`${r.logged_at}:${r.model_id}`} className="border-border/50 border-b py-1">
                  <td className="py-1 pr-4 text-fg-muted">{r.logged_at.slice(0, 16)}</td>
                  <td className="py-1 pr-4">{r.model_id}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{r.input_tokens}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{r.output_tokens}</td>
                  <td className="py-1 text-right tabular-nums">${(r.cost_usd ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function buildDailySeries(log: UsageRow[]): DailyPoint[] {
  const map = new Map<string, number>();
  for (const row of log) {
    const day = row.logged_at.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + (row.cost_usd ?? 0));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, cost]) => ({ day, cost }));
}

function KpiCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
