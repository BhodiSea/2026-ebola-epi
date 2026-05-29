import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export interface SparklinePoint {
  date: string;
  quoteId?: null | string;
  value: number;
}

export interface StatTotals {
  cfr: null | number;
  confirmed: { quoteId: null | string; value: number };
  deaths: { quoteId: null | string; value: number };
  zonesAffected: number;
}

/* eslint-disable @typescript-eslint/naming-convention */
const EpiRow = z.object({
  as_of: z.string(),
  metric: z.string(),
  source_quote_id: z.string().nullable(),
  value: z.number(),
});

const SparkRow = z.object({
  as_of: z.string(),
  value: z.number(),
});

const StatRow = z.object({
  metric: z.string(),
  source_quote_id: z.string().nullable(),
  value: z.number(),
});

const ZoneRow = z.object({
  admin2_code: z.string().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

type StatRowType = z.infer<typeof StatRow>;

/* ─── helpers ───────────────────────────────────────────────────────────────── */

function accumulate(
  rows: StatRowType[],
  metric: string,
): { quoteId: null | string; value: number } {
  let total = 0;
  let quoteId: null | string = null;
  for (const row of rows) {
    if (row.metric === metric) {
      total += row.value;
      quoteId ??= row.source_quote_id;
    }
  }
  return { value: total, quoteId };
}

const EMPTY_TOTALS: StatTotals = {
  confirmed: { value: 0, quoteId: null },
  deaths: { value: 0, quoteId: null },
  cfr: null,
  zonesAffected: 0,
};

/* ─── queries ───────────────────────────────────────────────────────────────── */

type EpiRowType = z.infer<typeof EpiRow>;

export async function getEpiCurveSeries(outbreakId: string): Promise<{
  confirmed: SparklinePoint[];
  deaths: SparklinePoint[];
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("case_counts")
    .select("as_of, metric, value, source_quote_id")
    .eq("outbreak_id", outbreakId)
    .eq("status", "published")
    .is("superseded_by", null)
    .in("metric", ["confirmed", "deaths"])
    .order("as_of", { ascending: true });

  if (data === null) {
    return { confirmed: [], deaths: [] };
  }

  const rows = z.array(EpiRow).safeParse(data);
  if (!rows.success) {
    return { confirmed: [], deaths: [] };
  }

  return {
    confirmed: buildEpiSeries(rows.data, "confirmed"),
    deaths: buildEpiSeries(rows.data, "deaths"),
  };
}

export async function getSparkline14d(
  outbreakId: string,
  metric: string,
): Promise<SparklinePoint[]> {
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const { data } = await supabase
    .from("case_counts")
    .select("as_of, value")
    .eq("outbreak_id", outbreakId)
    .eq("metric", metric)
    .eq("status", "published")
    .is("superseded_by", null)
    .gte("as_of", cutoff.toISOString().slice(0, 10))
    .order("as_of", { ascending: true });

  if (data === null) {
    return [];
  }

  const rows = z.array(SparkRow).safeParse(data);
  if (!rows.success) {
    return [];
  }

  const byDate = new Map<string, number>();
  for (const row of rows.data) {
    byDate.set(row.as_of, (byDate.get(row.as_of) ?? 0) + row.value);
  }

  return [...byDate.entries()].map(([date, value]) => ({ date, value }));
}

export async function getStatTotals(outbreakId: string): Promise<StatTotals> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("case_counts")
    .select("metric, value, source_quote_id")
    .eq("outbreak_id", outbreakId)
    .eq("status", "published")
    .is("superseded_by", null)
    .in("metric", ["confirmed", "deaths"]);

  if (data === null) {
    return EMPTY_TOTALS;
  }

  const rows = z.array(StatRow).safeParse(data);
  if (!rows.success) {
    return EMPTY_TOTALS;
  }

  const confirmed = accumulate(rows.data, "confirmed");
  const deaths = accumulate(rows.data, "deaths");
  const cfr = confirmed.value > 0 ? Math.round((deaths.value / confirmed.value) * 1000) / 10 : null;
  const zonesAffected = await countZonesAffected(outbreakId);

  return { confirmed, deaths, cfr, zonesAffected };
}

/** Group one metric's rows by date, summing values and keeping the first row's quote id as a
 *  representative provenance link (matches the accumulate() convention for headline figures). */
function buildEpiSeries(rows: EpiRowType[], metric: string): SparklinePoint[] {
  const byDate = new Map<string, SparklinePoint>();
  for (const row of rows) {
    if (row.metric !== metric) {
      continue;
    }
    const cur = byDate.get(row.as_of);
    byDate.set(row.as_of, {
      date: row.as_of,
      value: (cur?.value ?? 0) + row.value,
      quoteId: cur?.quoteId ?? row.source_quote_id,
    });
  }
  return [...byDate.values()];
}

async function countZonesAffected(outbreakId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_counts")
    .select("admin2_code")
    .eq("outbreak_id", outbreakId)
    .eq("metric", "confirmed")
    .eq("status", "published")
    .is("superseded_by", null)
    .not("admin2_code", "is", null);

  if (data === null) {
    return 0;
  }

  const rows = z.array(ZoneRow).safeParse(data);
  if (!rows.success) {
    return 0;
  }

  const zones = new Set<string>();
  for (const row of rows.data) {
    if (row.admin2_code !== null) {
      zones.add(row.admin2_code);
    }
  }
  return zones.size;
}
