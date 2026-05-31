"use client";

import { useState, useTransition } from "react";

import { enqueueBackfillAction } from "@/app/internal/backfill/actions";

interface Props {
  documents: { id: string; publishedAt: Date | null; url: string }[];
}

export function BackfillEnqueueForm({ documents }: Readonly<Props>) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<null | string>(null);

  function toggleAll() {
    setSelected(selected.length === documents.length ? [] : documents.map((d) => d.id));
  }

  function toggle(id: string) {
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.length === 0) {
      return;
    }
    startTransition(async () => {
      await enqueueBackfillAction({ documentIds: selected });
      setSelected([]);
      setToast(`Enqueued ${selected.length} document(s) for back-fill.`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {toast === null ? null : <p className="font-mono text-[11px] text-accent">{toast}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleAll}
          className="font-mono text-[11px] text-fg-muted hover:text-fg"
        >
          {selected.length === documents.length ? "Deselect all" : "Select all"}
        </button>
        <span className="font-mono text-[11px] text-fg-muted">{selected.length} selected</span>
        <button
          type="submit"
          disabled={isPending || selected.length === 0}
          className="ml-auto font-mono text-[11px] text-accent hover:underline disabled:opacity-50"
        >
          {isPending ? "Enqueuing…" : "Enqueue back-fill"}
        </button>
      </div>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-border border-b text-left text-fg-muted">
            <th className="w-6 pb-1" />
            <th className="pr-4 pb-1">URL</th>
            <th className="pb-1">Published</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-border/50 border-b">
              <td className="py-1.5 pr-2">
                <input
                  type="checkbox"
                  checked={selected.includes(doc.id)}
                  onChange={() => {
                    toggle(doc.id);
                  }}
                  className="accent-accent"
                />
              </td>
              <td className="max-w-xs truncate py-1.5 pr-4 text-fg-muted">{doc.url}</td>
              <td className="py-1.5 text-fg-muted">
                {doc.publishedAt?.toISOString().slice(0, 10) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </form>
  );
}
