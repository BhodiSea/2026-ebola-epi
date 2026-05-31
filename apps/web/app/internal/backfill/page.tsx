import { BackfillEnqueueForm } from "@/components/internal/backfill-enqueue-form";
import { listBatchResults } from "@/lib/queries/batch-results";
import { listUnextractedDocuments } from "@/lib/queries/unextracted-documents";

export default async function BackfillPage() {
  const [rows, unextracted] = await Promise.all([listBatchResults(), listUnextractedDocuments()]);

  const byBatch = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.batch_id] = (acc[r.batch_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-[13px] text-fg-muted uppercase tracking-wide">Back-fill</h1>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] text-fg-muted uppercase tracking-wide">
          Enqueue back-fill ({unextracted.length} un-extracted document
          {unextracted.length === 1 ? "" : "s"})
        </h2>
        {unextracted.length === 0 ? (
          <p className="font-mono text-[12px] text-fg-muted">All documents have been extracted.</p>
        ) : (
          <BackfillEnqueueForm documents={unextracted} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-mono text-[11px] text-fg-muted uppercase tracking-wide">
          Recent results
        </h2>
        {rows.length === 0 ? (
          <p className="font-mono text-[12px] text-fg-muted">No batch results recorded yet.</p>
        ) : (
          <>
            <div className="space-y-1">
              {Object.entries(byBatch).map(([batchId, count]) => (
                <div key={batchId} className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-fg">{batchId}</span>
                  <span className="text-fg-muted">{count} results</span>
                </div>
              ))}
            </div>
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-border border-b text-left text-fg-muted">
                  <th className="pr-4 pb-1">Date</th>
                  <th className="pr-4 pb-1">Batch</th>
                  <th className="pr-4 pb-1">Custom ID</th>
                  <th className="pb-1">Document</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-border/50 border-b">
                    <td className="py-1.5 pr-4 text-fg-muted">{r.created_at.slice(0, 16)}</td>
                    <td className="py-1.5 pr-4">{r.batch_id}</td>
                    <td className="py-1.5 pr-4 text-fg-subtle">{r.custom_id}</td>
                    <td className="py-1.5 text-fg-subtle">
                      {r.document_id === null ? "—" : `${r.document_id.slice(0, 8)}…`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
