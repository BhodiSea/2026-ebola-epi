import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const ShadowResultRow = z.object({
  candidate_version: z.string(),
  created_at: z.string(),
  document_id: z.string(),
  field_variances: z.record(z.string(), z.unknown()),
  id: z.string(),
  production_run_id: z.string().nullable(),
  promoted: z.boolean(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type ShadowResult = z.infer<typeof ShadowResultRow>;

export async function listShadowResults(): Promise<ShadowResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("shadow_results")
    .select(
      "id, document_id, candidate_version, production_run_id, field_variances, promoted, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error !== null) {
    return [];
  }

  const parsed = z.array(ShadowResultRow).safeParse(data);
  return parsed.success ? parsed.data : [];
}
