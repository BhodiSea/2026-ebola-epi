import type { Incident } from "@/components/internal/escalations-board";
import { EscalationsBoard } from "@/components/internal/escalations-board";
import { createClient } from "@/lib/supabase/server";

export default async function EscalationsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("incidents")
    .select("id, status, class, detail, document_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const open = ((rows ?? []) as Incident[]).filter((i) => i.status !== "acked");

  return (
    <div className="flex-1 space-y-6 p-6">
      <h1 className="font-mono text-fg-muted text-sm uppercase tracking-wide">Escalations</h1>
      <EscalationsBoard incidents={open} />
    </div>
  );
}
