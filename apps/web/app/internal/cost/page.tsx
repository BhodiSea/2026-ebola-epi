import { CostDailyArea } from "@/components/internal/cost-daily-area";
import { getCostKpis } from "@/lib/queries/cost";

export type { CostDailyRow as DailyViewRow } from "@/lib/queries/cost";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function CostPage() {
  // eslint-disable-next-line react-hooks/purity -- Server Component runs once per request; Date.now() is safe
  const cutoffDate = new Date(Date.now() - THIRTY_DAYS_MS).toISOString().slice(0, 10);
  const todayDate = new Date().toISOString().slice(0, 10);

  const { daily, outliers, runCount, total30d, totalToday, costPerRun } = await getCostKpis(
    cutoffDate,
    todayDate,
  );

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">LLM Cost</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Today" value={`$${totalToday.toFixed(2)}`} />
        <KpiCard label="30-day" value={`$${total30d.toFixed(2)}`} />
        <KpiCard label="Runs" value={String(runCount)} />
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

function KpiCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
