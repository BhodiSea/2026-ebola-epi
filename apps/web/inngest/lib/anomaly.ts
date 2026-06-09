import "server-only";

import type { MetricLiteral } from "@ituri/db";
import { caseCounts } from "@ituri/db";
import type { OutbreakId } from "@ituri/shared";
import { and, desc, eq, isNull, lt, lte, sql } from "drizzle-orm";

import type { Tx } from "@/lib/db";

// --- types --------------------------------------------------------------------

/** Collected during persist; consumed by extract-document to write incidents + notify. */
export interface AnomalyEscalation {
  caseCountId: string;
  outbreakId: string;
  signals: AnomalySignal[];
}

export type AnomalyKind = "cfr" | "cluster_100km" | "zscore";

export interface AnomalyParams {
  admin2Code: null | string;
  asOf: Date;
  metric: MetricLiteral;
  outbreakId: string;
  value: number;
}

export interface AnomalySignal {
  detail: Record<string, unknown>;
  kind: AnomalyKind;
}

// --- pure helpers (exported for unit tests) ----------------------------------

/**
 * Case-fatality ratio: deaths / confirmedCases.
 * Returns 0 when confirmedCases is 0 to avoid division by zero.
 */
export function computeCfrRatio(deaths: number, confirmedCases: number): number {
  if (confirmedCases === 0) {
    return 0;
  }
  return deaths / confirmedCases;
}

/**
 * Compute z-score of newValue relative to priorValues.
 * Returns null when n < 3 (insufficient history) or stddev === 0 (no variation).
 */
export function computeZScore(priorValues: number[], newValue: number): null | number {
  if (priorValues.length < 3) {
    return null;
  }
  const n = priorValues.length;
  const mean = priorValues.reduce((a, b) => a + b, 0) / n;
  const variance = priorValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  if (stddev === 0) {
    return null;
  }
  return (newValue - mean) / stddev;
}

// --- private signal detectors ------------------------------------------------

/**
 * Detect anomaly signals for a candidate case-count row before it is inserted.
 * Runs inside the same Drizzle transaction as the insert so no partial state is visible.
 *
 * Signals:
 *  1. zscore > 4 relative to published prior values for (outbreak, metric, admin2)
 *  2. CFR ≥ 0.80 (deaths metric: deaths / matching confirmed value)
 *  3. New admin2 cluster > 100 km from all prior admin2s with cases for this outbreak
 */
export async function detectAnomalies(tx: Tx, params: AnomalyParams): Promise<AnomalySignal[]> {
  const results = await Promise.all([
    detectZScore(tx, params),
    detectCfr(tx, params),
    detectCluster(tx, params),
  ]);
  return results.filter((s): s is AnomalySignal => s !== null);
}

async function detectCfr(tx: Tx, params: AnomalyParams): Promise<AnomalySignal | null> {
  if (params.metric !== "deaths") {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- outbreakId is validated at the persistence layer; branded cast is safe
  const outbreakId = params.outbreakId as OutbreakId;
  const adminFilter =
    params.admin2Code === null
      ? isNull(caseCounts.admin2Code)
      : eq(caseCounts.admin2Code, params.admin2Code);

  const casesRows = await tx
    .select({ value: caseCounts.value })
    .from(caseCounts)
    .where(
      and(
        eq(caseCounts.outbreakId, outbreakId),
        eq(caseCounts.metric, "confirmed"),
        eq(caseCounts.status, "published"),
        isNull(caseCounts.supersededBy),
        lte(caseCounts.asOf, params.asOf),
        adminFilter,
      ),
    )
    .orderBy(desc(caseCounts.asOf))
    .limit(1);

  const caseValue = casesRows[0]?.value;
  if (caseValue === undefined || caseValue === 0) {
    return null;
  }
  const ratio = computeCfrRatio(params.value, caseValue);
  if (ratio >= 0.8) {
    return { kind: "cfr", detail: { deaths: params.value, cases: caseValue, ratio } };
  }
  return null;
}

async function detectCluster(tx: Tx, params: AnomalyParams): Promise<AnomalySignal | null> {
  if (params.admin2Code === null) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- outbreakId is validated at the persistence layer; branded cast is safe
  const outbreakId = params.outbreakId as OutbreakId;

  const priorInAdmin2 = await tx
    .select({ id: caseCounts.id })
    .from(caseCounts)
    .where(
      and(
        eq(caseCounts.outbreakId, outbreakId),
        eq(caseCounts.admin2Code, params.admin2Code),
        eq(caseCounts.status, "published"),
        isNull(caseCounts.supersededBy),
      ),
    )
    .limit(1);

  if (priorInAdmin2.length > 0) {
    return null;
  }

  // New admin2 for this outbreak: check distance to nearest admin2 with prior cases.
  // Returns NULL from SQL when no other admin2s have cases (no comparison possible).
  // eslint-disable-next-line @typescript-eslint/naming-convention -- SQL column alias matches Postgres snake_case convention
  const result = await tx.execute<{ min_dist_m: null | number }>(sql`
    SELECT MIN(
      ST_Distance(
        (SELECT geom FROM geo.admin2 WHERE code = ${params.admin2Code})::geography,
        a2.geom::geography
      )
    ) AS min_dist_m
    FROM public.case_counts cc
    JOIN geo.admin2 a2 ON a2.code = cc.admin2_code
    WHERE cc.outbreak_id   = ${params.outbreakId}::uuid
      AND cc.status        = 'published'
      AND cc.superseded_by IS NULL
      AND cc.admin2_code   IS NOT NULL
      AND cc.admin2_code   != ${params.admin2Code}
      AND a2.geom          IS NOT NULL
  `);

  const minDistM = result[0]?.min_dist_m;
  if (minDistM !== null && minDistM !== undefined && minDistM > 100_000) {
    return {
      kind: "cluster_100km",
      detail: { minDistanceM: minDistM, admin2Code: params.admin2Code },
    };
  }
  return null;
}

// --- public API --------------------------------------------------------------

async function detectZScore(tx: Tx, params: AnomalyParams): Promise<AnomalySignal | null> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- outbreakId is validated at the persistence layer; branded cast is safe
  const outbreakId = params.outbreakId as OutbreakId;
  const adminFilter =
    params.admin2Code === null
      ? isNull(caseCounts.admin2Code)
      : eq(caseCounts.admin2Code, params.admin2Code);

  const priorRows = await tx
    .select({ value: caseCounts.value })
    .from(caseCounts)
    .where(
      and(
        eq(caseCounts.outbreakId, outbreakId),
        eq(caseCounts.metric, params.metric),
        eq(caseCounts.status, "published"),
        isNull(caseCounts.supersededBy),
        lt(caseCounts.asOf, params.asOf),
        adminFilter,
      ),
    );

  const priorValues = priorRows.map((r) => r.value);
  const z = computeZScore(priorValues, params.value);
  if (z !== null && Math.abs(z) > 4) {
    const n = priorValues.length;
    const mean = priorValues.reduce((a, b) => a + b, 0) / n;
    return { kind: "zscore", detail: { z, mean, priorN: n } };
  }
  return null;
}
