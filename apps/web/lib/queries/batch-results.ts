import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const BatchResultRow = z.object({
  batch_id: z.string(),
  created_at: z.string(),
  custom_id: z.string(),
  document_id: z.string().nullable(),
  id: z.string(),
  result: z.record(z.string(), z.unknown()),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type BatchResult = z.infer<typeof BatchResultRow>;

export async function listBatchResults(): Promise<BatchResult[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("batch_results")
    .select("id, batch_id, custom_id, document_id, result, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error !== null) {
    return [];
  }

  const parsed = z.array(BatchResultRow).safeParse(data);
  return parsed.success ? parsed.data : [];
}
