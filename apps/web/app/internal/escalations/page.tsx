import { AckButton } from "@/components/internal/ack-button";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
interface Incident {
  class: "anomaly" | "conflict_unresolvable" | "novel_pathogen_country" | "substring_verify_fail";
  created_at: string;
  detail: Record<string, unknown>;
  document_id: null | string;
  id: string;
  status: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

// Maps DB class values to the spec's display column labels
/* eslint-disable @typescript-eslint/naming-convention */
const CLASS_TO_COLUMN: Record<string, string> = {
  anomaly: "AnomalyDetected",
  conflict_unresolvable: "DisagreementGT25%",
  novel_pathogen_country: "LowConfidence",
  substring_verify_fail: "SubstringVerifyFail",
};
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
    .select("id, status, class, detail, document_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const incidents = (rows ?? []) as Incident[];
  const open = incidents.filter((i) => i.status !== "acked");

  function columnItems(col: string) {
    return open.filter((i) => CLASS_TO_COLUMN[i.class] === col);
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
                    <p className="truncate text-fg">{incidentLabel(incident)}</p>
                    <p className="mt-0.5 text-fg-muted">{incident.created_at.slice(0, 10)}</p>
                    <AckButton incidentId={incident.id} />
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

function incidentLabel(incident: Incident): string {
  const d = incident.detail;
  if (typeof d.summary === "string") {
    return d.summary;
  }
  if (typeof d.message === "string") {
    return d.message;
  }
  return incident.class;
}
