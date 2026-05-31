import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const EvalScoreRow = z.object({
  evaluated_at: z.string(),
  metric: z.string(),
  run_id: z.string(),
  score: z.number(),
  source_slug: z.string().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type EvalScore = z.infer<typeof EvalScoreRow>;

export async function listEvalScores(): Promise<EvalScore[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("extraction_eval_scores")
    .select("run_id, metric, score, source_slug, evaluated_at")
    .order("evaluated_at", { ascending: false })
    .limit(200);

  if (error !== null) {
    return [];
  }

  const parsed = z.array(EvalScoreRow).safeParse(data);
  return parsed.success ? parsed.data : [];
}
