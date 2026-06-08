import { FigureOrMissing } from "@/components/provenance/figure-or-missing";
import { getEpiCurveSeries } from "@/lib/queries/case-counts";

interface TabularViewProps {
  outbreakId: string;
}

export async function TabularView({ outbreakId }: Readonly<TabularViewProps>) {
  const { confirmed, deaths } = await getEpiCurveSeries(outbreakId);

  const dateSet = new Set([...confirmed.map((p) => p.date), ...deaths.map((p) => p.date)]);
  const dates = [...dateSet].sort((a, b) => a.localeCompare(b));
  const confMap = new Map(confirmed.map((p) => [p.date, p]));
  const deathMap = new Map(deaths.map((p) => [p.date, p]));

  return (
    <div data-tabular-view="" className="overflow-auto p-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-[var(--color-border)] border-b">
            <th className="py-2 pr-4 text-left font-mono text-(--color-fg-muted) text-[11px] uppercase tracking-wide">
              Date
            </th>
            <th className="py-2 pr-4 text-right font-mono text-(--color-fg-muted) text-[11px] uppercase tracking-wide">
              Confirmed
            </th>
            <th className="py-2 text-right font-mono text-(--color-fg-muted) text-[11px] uppercase tracking-wide">
              Deaths
            </th>
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => (
            <tr key={date} className="border-[var(--color-border)] border-b">
              <td className="py-1.5 pr-4 font-mono text-xs">{date}</td>
              <td className="py-1.5 pr-4 text-right font-mono text-xs" data-numeric="">
                <FigureOrMissing
                  value={confMap.get(date)?.value ?? 0}
                  quoteId={confMap.get(date)?.quoteId ?? null}
                />
              </td>
              <td className="py-1.5 text-right font-mono text-xs" data-numeric="">
                <FigureOrMissing
                  value={deathMap.get(date)?.value ?? 0}
                  quoteId={deathMap.get(date)?.quoteId ?? null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
