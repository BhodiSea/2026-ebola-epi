import { listShadowResults } from "@/lib/queries/shadow-results";

export default async function ShadowPage() {
  const rows = await listShadowResults();

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">
        Shadow Extraction Results
      </h1>

      {rows.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">No shadow runs recorded yet.</p>
      ) : (
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-border border-b text-left text-fg-muted">
              <th className="pr-4 pb-1">Date</th>
              <th className="pr-4 pb-1">Candidate</th>
              <th className="pr-4 pb-1">Document</th>
              <th className="pr-4 pb-1">Variances</th>
              <th className="pb-1">Promoted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-border/50 border-b">
                <td className="py-1.5 pr-4 text-fg-muted">{r.created_at.slice(0, 16)}</td>
                <td className="py-1.5 pr-4">{r.candidate_version}</td>
                <td className="py-1.5 pr-4 text-fg-subtle">{r.document_id.slice(0, 8)}&hellip;</td>
                <td className="py-1.5 pr-4 tabular-nums">
                  {Object.keys(r.field_variances).length} fields
                </td>
                <td className="py-1.5">
                  <span
                    className={
                      r.promoted
                        ? "rounded bg-success/20 px-1.5 py-0.5 font-mono text-[10px] text-success"
                        : "rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
                    }
                  >
                    {r.promoted ? "yes" : "no"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
