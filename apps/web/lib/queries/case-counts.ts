import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

// --- Disagreement types --------------------------------------------------------

export interface DisagreementEntry {
  quoteId: null | string;
  rowId: string;
  sourceSlug: string;
  /** true when superseded_by is non-null — this row lost reconciliation */
  superseded: boolean;
  value: number;
}

/** Keyed by `${metric}:${asOf}` (e.g. "cases:2026-05-27"). */
export type DisagreementsMap = Map<string, DisagreementEntry[]>;

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
  as_of: z.string(),
  metric: z.string(),
  source_quote_id: z.string().nullable(),
  value: z.number(),
});

const InternationalStatRow = z.object({
  as_of: z.string(),
  metric: z.string(),
  outbreak_id: z.string(),
  source_quote_id: z.string().nullable(),
  value: z.number(),
});

const OutbreakIdRow = z.object({
  id: z.string(),
});

const ZoneRow = z.object({
  admin2_code: z.string().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

interface InternationalAccumulator {
  confirmedBest: number;
  confirmedQuote: null | string;
  confirmedTotal: number;
  deathsBest: number;
  deathsQuote: null | string;
  deathsTotal: number;
}

type InternationalStatRowType = z.infer<typeof InternationalStatRow>;

type StatRowType = z.infer<typeof StatRow>;

/* --- helpers ----------------------------------------------------------------- */

/**
 * Returns the value and quoteId from the first row matching `metric`.
 * Rows must be ordered by as_of DESC so the first match is the latest snapshot.
 */
function pickLatest(
  rows: StatRowType[],
  metric: string,
): { quoteId: null | string; value: number } {
  const row = rows.find((r) => r.metric === metric);
  return row === undefined
    ? { value: 0, quoteId: null }
    : { value: row.value, quoteId: row.source_quote_id };
}

/**
 * Given rows ordered by as_of DESC, picks the latest snapshot per (outbreak_id, metric)
 * and sums values across all countries.
 */
function sumLatestPerCountry(rows: InternationalStatRowType[]): InternationalAccumulator {
  const seen = new Set<string>();
  const acc: InternationalAccumulator = {
    confirmedTotal: 0,
    deathsTotal: 0,
    confirmedQuote: null,
    deathsQuote: null,
    confirmedBest: -1,
    deathsBest: -1,
  };

  for (const row of rows) {
    const key = `${row.outbreak_id}:${row.metric}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (row.metric === "confirmed") {
      acc.confirmedTotal += row.value;
      if (row.value > acc.confirmedBest) {
        acc.confirmedBest = row.value;
        acc.confirmedQuote = row.source_quote_id;
      }
    } else if (row.metric === "deaths") {
      acc.deathsTotal += row.value;
      if (row.value > acc.deathsBest) {
        acc.deathsBest = row.value;
        acc.deathsQuote = row.source_quote_id;
      }
    }
  }

  return acc;
}

const EMPTY_TOTALS: StatTotals = {
  confirmed: { value: 0, quoteId: null },
  deaths: { value: 0, quoteId: null },
  cfr: null,
  zonesAffected: 0,
};

/* --- queries ----------------------------------------------------------------- */

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
    .is("admin_name", null)
    .is("admin2_code", null)
    .in("metric", ["confirmed", "deaths"])
    .or("is_new_in_period.is.null,is_new_in_period.eq.false")
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

/**
 * Returns headline stats summed across ALL active outbreaks for a pathogen.
 * Use this for the /today dashboard where the outbreak spans multiple countries.
 * Per country: picks the latest national cumulative snapshot for each metric.
 * The quoteId returned is from the highest-value contributing country.
 */
export async function getInternationalStatTotals(pathogenIcd11: string): Promise<StatTotals> {
  const supabase = await createClient();

  const { data: outbreakData } = await supabase
    .from("outbreaks")
    .select("id")
    .eq("pathogen_icd11", pathogenIcd11)
    .eq("status", "active");

  if (outbreakData === null || outbreakData.length === 0) {
    return EMPTY_TOTALS;
  }

  const parsedOutbreaks = z.array(OutbreakIdRow).safeParse(outbreakData);
  if (!parsedOutbreaks.success) {
    return EMPTY_TOTALS;
  }

  const ids = parsedOutbreaks.data.map((r) => r.id);

  const { data } = await supabase
    .from("case_counts")
    .select("outbreak_id, as_of, metric, value, source_quote_id")
    .in("outbreak_id", ids)
    .eq("status", "published")
    .is("superseded_by", null)
    .is("admin_name", null)
    .is("admin2_code", null)
    .in("metric", ["confirmed", "deaths"])
    .or("is_new_in_period.is.null,is_new_in_period.eq.false")
    .order("as_of", { ascending: false });

  if (data === null) {
    return EMPTY_TOTALS;
  }

  const rows = z.array(InternationalStatRow).safeParse(data);
  if (!rows.success) {
    return EMPTY_TOTALS;
  }

  const acc = sumLatestPerCountry(rows.data);
  const cfr =
    acc.confirmedTotal > 0 ? Math.round((acc.deathsTotal / acc.confirmedTotal) * 1000) / 10 : null;
  const zonesAffected = await countZonesAffected(ids);

  return {
    confirmed: { value: acc.confirmedTotal, quoteId: acc.confirmedQuote },
    deaths: { value: acc.deathsTotal, quoteId: acc.deathsQuote },
    cfr,
    zonesAffected,
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
    .is("admin_name", null)
    .is("admin2_code", null)
    .or("is_new_in_period.is.null,is_new_in_period.eq.false")
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

/**
 * Returns headline stats for a single outbreak (country-scoped detail pages).
 * Picks the latest national cumulative snapshot per metric — does NOT sum
 * across weekly snapshots or zone-level rows.
 */
export async function getStatTotals(outbreakId: string): Promise<StatTotals> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("case_counts")
    .select("as_of, metric, value, source_quote_id")
    .eq("outbreak_id", outbreakId)
    .eq("status", "published")
    .is("superseded_by", null)
    .is("admin_name", null)
    .is("admin2_code", null)
    .in("metric", ["confirmed", "deaths"])
    .or("is_new_in_period.is.null,is_new_in_period.eq.false")
    .order("as_of", { ascending: false });

  if (data === null) {
    return EMPTY_TOTALS;
  }

  const rows = z.array(StatRow).safeParse(data);
  if (!rows.success) {
    return EMPTY_TOTALS;
  }

  const confirmed = pickLatest(rows.data, "confirmed");
  const deaths = pickLatest(rows.data, "deaths");
  const cfr = confirmed.value > 0 ? Math.round((deaths.value / confirmed.value) * 1000) / 10 : null;
  const zonesAffected = await countZonesAffected([outbreakId]);

  return { confirmed, deaths, cfr, zonesAffected };
}

/** Group one metric's rows by date, summing values and keeping the first quoteId as provenance. */
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

async function countZonesAffected(outbreakIds: string[]): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_counts")
    .select("admin2_code")
    .in("outbreak_id", outbreakIds)
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

/* eslint-disable @typescript-eslint/naming-convention */
const DisagreementRow = z.object({
  as_of: z.string(),
  metric: z.string(),
  row_id: z.string(),
  source_quote_id: z.string().nullable(),
  source_slug: z.string(),
  superseded_by: z.string().nullable(),
  value: z.number(),
});
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Returns published case_counts rows where multiple distinct sources reported
 * conflicting values for the same (metric, as_of) key. Includes superseded rows
 * so the UI can render the losing value strikethrough-dimmed after reconciliation.
 * Uses the get_disagreements RPC (SECURITY DEFINER) to join across audit schema.
 */
export async function getDisagreements(outbreakId: string): Promise<DisagreementsMap> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data } = await supabase.rpc("get_disagreements", {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    p_outbreak_id: outbreakId,
  });

  const map: DisagreementsMap = new Map();
  if (data === null) {
    return map;
  }

  const rows = z.array(DisagreementRow).safeParse(data);
  if (!rows.success) {
    return map;
  }

  for (const row of rows.data) {
    const key = `${row.metric}:${row.as_of}`;
    const entry: DisagreementEntry = {
      rowId: row.row_id,
      value: row.value,
      sourceSlug: row.source_slug,
      quoteId: row.source_quote_id,
      superseded: row.superseded_by !== null,
    };
    const existing = map.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }
  return map;
}
