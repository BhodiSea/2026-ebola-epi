import { CostDailyArea } from "@/components/internal/cost-daily-area";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
// Exported for the chart component
export interface DailyViewRow {
  day: string;
  model_id: string;
  total_cost: number | string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
interface OutlierRow {
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
  const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0, 10);

  const todayDate = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  const [{ data: viewData }, { data: outlierData }, { count: runCount }] = await Promise.all([
    supabase
      .from("anthropic_usage_daily")
      .select("day, model_id, total_cost")
      .gte("day", cutoffDate)
      .order("day", { ascending: true })
      .limit(300),
    supabase
      .from("anthropic_usage_log")
      .select("logged_at, model_id, input_tokens, output_tokens, cost_usd")
      .order("cost_usd", { ascending: false })
      .limit(10),
    supabase
      .from("extraction_runs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoffDate),
  ]);

  const daily = (viewData ?? []) as DailyViewRow[];
  const outliers = (outlierData ?? []) as OutlierRow[];

  const { total30d, totalToday, costPerRun } = computeKpis(daily, todayDate, runCount ?? 0);

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">LLM Cost</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Today" value={`$${totalToday.toFixed(2)}`} />
        <KpiCard label="30-day" value={`$${total30d.toFixed(2)}`} />
        <KpiCard label="Runs" value={String(runCount ?? 0)} />
        <KpiCard label="$/extraction" value={`$${costPerRun.toFixed(4)}`} />
      </div>

      {daily.length > 0 ? (
        <section>
          <h2 className="mb-3 font-mono text-fg-muted text-xs uppercase tracking-wide">
            Daily Spend by Model (30d)
          </h2>
          <CostDailyArea data={daily} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-mono text-fg-muted text-xs uppercase tracking-wide">
          Top 10 Outliers
        </h2>
        {outliers.length === 0 ? (
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
              {outliers.map((r) => (
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

function computeKpis(
  daily: DailyViewRow[],
  todayDate: string,
  runCount: number,
): { costPerRun: number; total30d: number; totalToday: number } {
  const total30d = daily.reduce((s, r) => s + Number(r.total_cost), 0);
  const totalToday = daily
    .filter((r) => r.day === todayDate)
    .reduce((s, r) => s + Number(r.total_cost), 0);
  const costPerRun = runCount > 0 ? total30d / runCount : 0;
  return { total30d, totalToday, costPerRun };
}

function KpiCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
