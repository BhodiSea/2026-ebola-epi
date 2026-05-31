import { EscalationsBoard } from "@/components/internal/escalations-board";
import { listIncidents } from "@/lib/queries/incidents";

export default async function EscalationsPage() {
  const all = await listIncidents();
  const open = all.filter((i) => i.status !== "acked");

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">Escalations</h1>
      <EscalationsBoard incidents={open} />
    </div>
  );
}
