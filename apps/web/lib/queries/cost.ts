import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const DailyViewRow = z.object({
  day: z.string(),
  model_id: z.string(),
  total_cost: z.union([z.number(), z.string()]),
});

const UsageLogRow = z.object({
  cost_usd: z.number().nullable(),
  input_tokens: z.number(),
  logged_at: z.string(),
  model_id: z.string(),
  output_tokens: z.number(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type CostDailyRow = z.infer<typeof DailyViewRow>;

export interface CostKpis {
  costPerRun: number;
  daily: CostDailyRow[];
  outliers: CostOutlierRow[];
  runCount: number;
  total30d: number;
  totalToday: number;
}

export type CostOutlierRow = z.infer<typeof UsageLogRow>;

export async function getCostKpis(cutoffDate: string, todayDate: string): Promise<CostKpis> {
  const supabase = await createClient();

  const [{ data: viewData }, { data: outlierData }, { count: runCount }] = await Promise.all([
    supabase
      .from("anthropic_usage_daily")
      .select("day, model_id, total_cost")
      .gte("day", cutoffDate)
      .order("day", { ascending: true })
      .limit(300),
    supabase
      .from("anthropic_usage_log")
      .select("logged_at, model_id, input_tokens, output_tokens, cost_usd")
      .order("cost_usd", { ascending: false })
      .limit(10),
    supabase
      .from("extraction_runs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoffDate),
  ]);

  const dailyParsed = z.array(DailyViewRow).safeParse(viewData ?? []);
  const outliersParsed = z.array(UsageLogRow).safeParse(outlierData ?? []);

  const daily = dailyParsed.success ? dailyParsed.data : [];
  const outliers = outliersParsed.success ? outliersParsed.data : [];
  const runs = runCount ?? 0;

  const total30d = daily.reduce((s, r) => s + Number(r.total_cost), 0);
  const totalToday = daily
    .filter((r) => r.day === todayDate)
    .reduce((s, r) => s + Number(r.total_cost), 0);
  const costPerRun = runs > 0 ? total30d / runs : 0;

  return { daily, outliers, runCount: runs, total30d, totalToday, costPerRun };
}
