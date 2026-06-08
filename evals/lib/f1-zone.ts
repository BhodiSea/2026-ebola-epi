/**
 * Zone-aware F1 scorer for extraction evaluation.
 *
 * Extends the base scorer (f1.ts) by including admin_name in the tuple key.
 * This catches regressions where the model drops or mis-assigns health zone
 * names even when the numeric figures are correct.
 *
 * admin_name is normalised to lower-case trimmed before keying so that
 * capitalisation differences ("Rwampara" vs "rwampara") are not penalised.
 * When admin_name is absent on a tuple, the key uses an empty segment — it
 * will never match a tuple that carries an admin_name (intentional: the
 * point is to detect the absence).
 */

import type { ExtractionTuple } from "./f1.js";

export interface ZoneExtractionTuple extends ExtractionTuple {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches extraction output schema field name; cannot rename external identifier
  admin_name?: string;
}

export interface ZoneF1Result {
  f1: number;
  falseNegatives: ZoneExtractionTuple[];
  falsePositives: ZoneExtractionTuple[];
  precision: number;
  recall: number;
  truePositiveCount: number;
}

export function computeF1Zone(
  expected: ZoneExtractionTuple[],
  actual: ZoneExtractionTuple[],
): ZoneF1Result {
  const expectedKeys = new Map<string, ZoneExtractionTuple>(expected.map((t) => [zoneKey(t), t]));
  const actualKeys = new Map<string, ZoneExtractionTuple>(actual.map((t) => [zoneKey(t), t]));

  const truePositiveCount = [...actualKeys.keys()].filter((k) => expectedKeys.has(k)).length;
  const falsePositives = [...actualKeys.entries()]
    .filter(([k]) => !expectedKeys.has(k))
    .map(([, t]) => t);
  const falseNegatives = [...expectedKeys.entries()]
    .filter(([k]) => !actualKeys.has(k))
    .map(([, t]) => t);

  const precision = actualKeys.size === 0 ? 1 : truePositiveCount / actualKeys.size;
  const recall = expectedKeys.size === 0 ? 1 : truePositiveCount / expectedKeys.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { f1, precision, recall, truePositiveCount, falsePositives, falseNegatives };
}

function zoneKey(t: ZoneExtractionTuple): string {
  const zone = (t.admin_name ?? "").toLowerCase().trim();
  return `${t.pathogen_icd11}|${t.country_iso3}|${zone}|${t.metric}|${t.value}|${t.as_of}`;
}
