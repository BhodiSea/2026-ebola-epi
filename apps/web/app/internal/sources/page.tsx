import { SourcePauseButton } from "@/components/internal/source-pause-button";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
interface SourceRow {
  extraction_paused: boolean;
  failure_count_7d: null | number;
  id: string;
  last_fetched_at: null | string;
  name: null | string;
  parser_version: null | string;
  slug: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

const STATUS_PILL: Record<string, string> = {
  failing: "rounded px-1.5 py-0.5 font-mono text-[10px] bg-emergency/20 text-emergency",
  ok: "rounded px-1.5 py-0.5 font-mono text-[10px] bg-surface-3 text-fg",
  paused: "rounded px-1.5 py-0.5 font-mono text-[10px] bg-warn/20 text-warn",
};

export default async function SourcesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("sources")
    .select("id, slug, name, last_fetched_at, parser_version, extraction_paused, failure_count_7d")
    .order("slug");

  const sources = (rows ?? []) as SourceRow[];

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">Parser Health</h1>

      {sources.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">No sources configured.</p>
      ) : (
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-border border-b text-left text-fg-muted">
              <th className="pr-4 pb-1">Slug</th>
              <th className="pr-4 pb-1">Last fetch</th>
              <th className="pr-4 pb-1">Parser ver.</th>
              <th className="pr-4 pb-1 text-right">Fails (7d)</th>
              <th className="pr-4 pb-1">Status</th>
              <th className="pb-1">Toggle</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((src) => {
              const sk = statusKey(src);
              return (
                <tr key={src.id} className="border-border/50 border-b">
                  <td className="py-1.5 pr-4 font-semibold">{src.slug}</td>
                  <td className="py-1.5 pr-4 text-fg-muted">
                    {src.last_fetched_at?.slice(0, 16) ?? "—"}
                  </td>
                  <td className="py-1.5 pr-4 text-fg-muted">{src.parser_version ?? "—"}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">
                    {src.failure_count_7d ?? 0}
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={STATUS_PILL[sk]}>{sk}</span>
                  </td>
                  <td className="py-1.5">
                    <SourcePauseButton sourceId={src.id} paused={src.extraction_paused} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function statusKey(row: SourceRow): string {
  if (row.extraction_paused) {
    return "paused";
  }
  if ((row.failure_count_7d ?? 0) > 3) {
    return "failing";
  }
  return "ok";
}
