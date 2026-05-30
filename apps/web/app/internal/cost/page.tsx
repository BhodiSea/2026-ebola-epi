import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
interface UsageRow {
  cost_usd: null | number;
  input_tokens: number;
  logged_at: string;
  model_id: string;
  output_tokens: number;
}
/* eslint-enable @typescript-eslint/naming-convention */

export default async function CostPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("anthropic_usage_log")
    .select("logged_at, model_id, input_tokens, output_tokens, cost_usd")
    .order("logged_at", { ascending: false })
    .limit(200);

  const log = (rows ?? []) as UsageRow[];

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const totalToday = log
    .filter((r) => r.logged_at.startsWith(todayPrefix))
    .reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const total30d = log.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  const topOutliers = [...log].sort((a, b) => (b.cost_usd ?? 0) - (a.cost_usd ?? 0)).slice(0, 10);

  return (
    <div className="flex-1 space-y-8 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">LLM Cost</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Today" value={`$${totalToday.toFixed(2)}`} />
        <KpiCard label="30-day" value={`$${total30d.toFixed(2)}`} />
        <KpiCard label="Rows" value={String(log.length)} />
      </div>

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

function KpiCard({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-border bg-bg p-4">
      <p className="font-mono text-[10px] text-fg-muted uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
    </div>
  );
}
