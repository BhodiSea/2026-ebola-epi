import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const IncidentRow = z.object({
  class: z.enum([
    "anomaly",
    "conflict_unresolvable",
    "novel_pathogen_country",
    "substring_verify_fail",
  ]),
  created_at: z.string(),
  detail: z.record(z.string(), z.unknown()),
  document_id: z.string().nullable(),
  id: z.string(),
  status: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type Incident = z.infer<typeof IncidentRow>;

export async function listIncidents(): Promise<Incident[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("incidents")
    .select("id, status, class, detail, document_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error !== null) {
    return [];
  }

  const parsed = z.array(IncidentRow).safeParse(data);
  return parsed.success ? parsed.data : [];
}
