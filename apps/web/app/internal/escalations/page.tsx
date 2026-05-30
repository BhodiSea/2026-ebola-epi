import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
interface Incident {
  category: string;
  created_at: string;
  description: null | string;
  id: string;
  status: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

const COLUMNS = [
  "AnomalyDetected",
  "LowConfidence",
  "DisagreementGT25%",
  "SubstringVerifyFail",
] as const;

export default async function EscalationsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("incidents")
    .select("id, status, category, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const incidents = (rows ?? []) as Incident[];
  const open = incidents.filter((i) => i.status !== "acked");

  function columnItems(col: string) {
    return open.filter((i) => i.category === col);
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">Escalations</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col} className="rounded-md border border-border bg-bg p-3">
            <h2 className="mb-2 font-mono text-[10px] text-fg-muted uppercase tracking-wide">
              {col}
            </h2>
            {columnItems(col).length === 0 ? (
              <p className="font-mono text-[11px] text-fg-subtle">No open items</p>
            ) : (
              <ul className="space-y-2">
                {columnItems(col).map((incident) => (
                  <li
                    key={incident.id}
                    className="rounded border border-border bg-surface-1 p-2 font-mono text-[11px]"
                  >
                    <p className="truncate text-fg">{incident.description ?? incident.id}</p>
                    <p className="mt-0.5 text-fg-muted">{incident.created_at.slice(0, 10)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
