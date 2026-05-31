import "server-only";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
interface SkipRow {
  subject_id: null | string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export async function listSkipCounts24h(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("agent_actions")
    .select("subject_id")
    .eq("agent", "ingest-runner")
    .eq("action", "ingest_skipped")
    .gte("ts", since);

  if (error !== null) {
    return {};
  }

  const tally = new Map<string, number>();
  for (const row of data as SkipRow[]) {
    if (row.subject_id !== null) {
      tally.set(row.subject_id, (tally.get(row.subject_id) ?? 0) + 1);
    }
  }
  return Object.fromEntries(tally);
}
