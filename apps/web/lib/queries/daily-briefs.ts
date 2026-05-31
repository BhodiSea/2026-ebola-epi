import "server-only";

import { z } from "zod";

import { createClient, createStaticClient } from "@/lib/supabase/server";

/* ─── schema ────────────────────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/naming-convention */
const DailyBriefRowSchema = z.object({
  body: z.string(),
  date: z.string(),
  headline: z.string(),
  model_id: z.string(),
  review_status: z.string(),
  severity: z.string().nullable(),
  source_quote_ids: z.array(z.string()),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type DailyBrief = ReturnType<typeof toBrief>;

type DailyBriefRow = z.infer<typeof DailyBriefRowSchema>;

/* ─── queries ───────────────────────────────────────────────────────────────── */

export async function getDailyBriefByDate(date: string): Promise<DailyBrief | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("daily_briefs")
    .select("date, headline, body, severity, model_id, review_status, source_quote_ids")
    .eq("date", date)
    .maybeSingle();

  if (error !== null || data === null) {
    return null;
  }

  const parsed = DailyBriefRowSchema.safeParse(data);
  return parsed.success ? toBrief(parsed.data) : null;
}

export async function listPublishedBriefs(): Promise<{ date: string }[]> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("daily_briefs")
    .select("date")
    .order("date", { ascending: false });

  if (error !== null) {
    return [];
  }

  const parsed = z.array(z.object({ date: z.string() })).safeParse(data);
  return parsed.success ? parsed.data : [];
}

/* ─── helpers ───────────────────────────────────────────────────────────────── */

function toBrief(row: DailyBriefRow) {
  return {
    date: row.date,
    headline: row.headline,
    body: row.body,
    severity: row.severity,
    modelId: row.model_id,
    reviewStatus: row.review_status,
    sourceQuoteIds: row.source_quote_ids,
  };
}
