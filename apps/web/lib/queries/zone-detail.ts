import "server-only";

import { z } from "zod";

import type { TimeWindow } from "@/lib/map/zone-detail-response";
import type { SparklinePoint, TotalsResult } from "@/lib/queries/case-counts";
import { createClient } from "@/lib/supabase/server";

export interface ZoneDateMetric {
  quoteId: null | string;
  value: null | string;
}

export interface ZoneMetric {
  quoteId: null | string;
  value: number;
}

export interface ZoneStatTotals {
  cfr: null | number;
  confirmed: ZoneMetric;
  deaths: ZoneMetric;
  firstDetected: ZoneDateMetric;
}

export const EMPTY_ZONE_STAT_TOTALS: ZoneStatTotals = {
  cfr: null,
  confirmed: { quoteId: null, value: 0 },
  deaths: { quoteId: null, value: 0 },
  firstDetected: { quoteId: null, value: null },
};

interface ZoneRawRow {
  asOf: string;
  metric: string;
  sourceQuoteId: string;
  status: string;
  value: number;
}

interface ZoneTotalsAccumulator {
  confirmed: number;
  confirmedQuote: null | string;
  deaths: number;
  deathsQuote: null | string;
  firstDetected: null | string;
  firstDetectedQuote: null | string;
}

/* eslint-disable @typescript-eslint/naming-convention */
const StatRow = z.object({
  as_of: z.string(),
  metric: z.string(),
  source_quote_id: z.string().nullable(),
  value: z.number(),
});

const RawRow = z.object({
  as_of: z.string(),
  metric: z.string(),
  source_quote_id: z.string(),
  status: z.string(),
  value: z.number(),
});
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
const WINDOW_DAYS: Record<Exclude<TimeWindow, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };
/* eslint-enable @typescript-eslint/naming-convention */

export async function getZoneEpiSeries(
  outbreakId: string,
  admin2Code: string,
  window: TimeWindow,
): Promise<{ confirmed: SparklinePoint[]; deaths: SparklinePoint[] }> {
  const supabase = await createClient();
  const cutoff = cutoffFor(window);

  let query = supabase
    .from("case_counts")
    .select("metric, value, as_of")
    .eq("outbreak_id", outbreakId)
    .eq("admin2_code", admin2Code)
    .eq("status", "published")
    .is("superseded_by", null)
    .in("metric", ["confirmed", "deaths"])
    .order("as_of", { ascending: true });
  if (cutoff !== null) {
    query = query.gte("as_of", cutoff);
  }

  // biome-ignore lint/nursery/useAwaitThenable: Supabase query builder is a PromiseLike thenable
  const { data } = await query;
  /* eslint-disable @typescript-eslint/naming-convention */
  const seriesShape = StatRow.pick({ metric: true, value: true, as_of: true });
  /* eslint-enable @typescript-eslint/naming-convention */
  const rows = z.array(seriesShape).safeParse(data);
  if (!rows.success) {
    return { confirmed: [], deaths: [] };
  }

  const confirmedByDate = new Map<string, number>();
  const deathsByDate = new Map<string, number>();
  for (const row of rows.data) {
    let target: Map<string, number> | null = null;
    if (row.metric === "confirmed") {
      target = confirmedByDate;
    } else if (row.metric === "deaths") {
      target = deathsByDate;
    }
    target?.set(row.as_of, (target.get(row.as_of) ?? 0) + row.value);
  }

  return {
    confirmed: [...confirmedByDate.entries()].map(([date, value]) => ({ date, value })),
    deaths: [...deathsByDate.entries()].map(([date, value]) => ({ date, value })),
  };
}

export async function getZoneRawRows(
  outbreakId: string,
  admin2Code: string,
): Promise<ZoneRawRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("case_counts")
    .select("metric, value, as_of, status, source_quote_id")
    .eq("outbreak_id", outbreakId)
    .eq("admin2_code", admin2Code)
    .eq("status", "published")
    .is("superseded_by", null)
    .order("as_of", { ascending: false })
    .limit(200);

  const rows = z.array(RawRow).safeParse(data);
  if (!rows.success) {
    return [];
  }

  return rows.data.map((r) => ({
    metric: r.metric,
    value: r.value,
    asOf: r.as_of,
    status: r.status,
    sourceQuoteId: r.source_quote_id,
  }));
}

/* eslint-disable @typescript-eslint/naming-convention */
const ZoneTotalRow = z.object({
  admin2_code: z.string().nullable(),
  value: z.number(),
  as_of: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export async function getZoneStatTotals(
  outbreakId: string,
  admin2Code: string,
  window: TimeWindow,
): Promise<TotalsResult<ZoneStatTotals>> {
  const supabase = await createClient();
  const cutoff = cutoffFor(window);

  let query = supabase
    .from("case_counts")
    .select("metric, value, as_of, source_quote_id")
    .eq("outbreak_id", outbreakId)
    .eq("admin2_code", admin2Code)
    .eq("status", "published")
    .is("superseded_by", null)
    .in("metric", ["confirmed", "deaths"]);
  if (cutoff !== null) {
    query = query.gte("as_of", cutoff);
  }

  // biome-ignore lint/nursery/useAwaitThenable: Supabase query builder is a PromiseLike thenable
  const { data } = await query;

  if (data === null) {
    return { ok: false, reason: "rpc-error" };
  }

  const rows = z.array(StatRow).safeParse(data);
  if (!rows.success) {
    return { ok: false, reason: "parse-error" };
  }

  if (rows.data.length === 0) {
    return { ok: false, reason: "no-rows" };
  }

  const acc = accumulateZoneTotals(rows.data);
  return {
    ok: true,
    data: {
      confirmed: { value: acc.confirmed, quoteId: acc.confirmedQuote },
      deaths: { value: acc.deaths, quoteId: acc.deathsQuote },
      cfr: acc.confirmed > 0 ? Math.round((acc.deaths / acc.confirmed) * 1000) / 10 : null,
      firstDetected: { value: acc.firstDetected, quoteId: acc.firstDetectedQuote },
    },
  };
}

/** Cumulative published confirmed cases per zone up to `asOf`, keyed by admin2 code.
 *  Drives the time-scrubbed choropleth: as the scrubber moves, the map re-colours to the
 *  cumulative totals known at that date (zones with no data yet fall out → no-data hatch). */
export async function getZoneTotalsAsOf(
  outbreakId: string,
  asOf: string,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("case_counts")
    .select("admin2_code, value, as_of")
    .eq("outbreak_id", outbreakId)
    .eq("metric", "confirmed")
    .eq("status", "published")
    .is("superseded_by", null)
    .lte("as_of", asOf)
    .not("admin2_code", "is", null)
    .order("as_of", { ascending: false });

  const rows = z.array(ZoneTotalRow).safeParse(data);
  if (!rows.success) {
    return {};
  }

  // Rows are newest-first; the first one seen per zone is its latest cumulative snapshot.
  // Do NOT sum across dates — cumulative restatements would double-count.
  const totals: Record<string, number> = {};
  for (const row of rows.data) {
    if (row.admin2_code !== null && !(row.admin2_code in totals)) {
      totals[row.admin2_code] = row.value;
    }
  }
  return totals;
}

/** case_counts metrics are cumulative restatements (each dated row is a running total, not an
 *  increment). The headline figure for a zone+metric is therefore the LATEST snapshot, never the
 *  sum across dates — summing would inflate without bound as sitreps accumulate. firstDetected is
 *  the EARLIEST confirmed snapshot and carries that row's provenance (hard rule #2). */
function accumulateZoneTotals(rows: z.infer<typeof StatRow>[]): ZoneTotalsAccumulator {
  const acc: ZoneTotalsAccumulator = {
    confirmed: 0,
    deaths: 0,
    confirmedQuote: null,
    deathsQuote: null,
    firstDetected: null,
    firstDetectedQuote: null,
  };
  let confirmedAsOf: null | string = null;
  let deathsAsOf: null | string = null;
  for (const row of rows) {
    if (row.metric === "confirmed") {
      if (confirmedAsOf === null || row.as_of > confirmedAsOf) {
        confirmedAsOf = row.as_of;
        acc.confirmed = row.value;
        acc.confirmedQuote = row.source_quote_id;
      }
      if (acc.firstDetected === null || row.as_of < acc.firstDetected) {
        acc.firstDetected = row.as_of;
        acc.firstDetectedQuote = row.source_quote_id;
      }
    } else if (row.metric === "deaths" && (deathsAsOf === null || row.as_of > deathsAsOf)) {
      deathsAsOf = row.as_of;
      acc.deaths = row.value;
      acc.deathsQuote = row.source_quote_id;
    }
  }
  return acc;
}

function cutoffFor(window: TimeWindow): null | string {
  if (window === "all") {
    return null;
  }
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS[window]);
  return d.toISOString().slice(0, 10);
}
