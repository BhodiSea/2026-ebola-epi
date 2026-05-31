/**
 * F1 scorer for extraction evaluation.
 *
 * Compares expected vs actual extraction tuples on the five identity fields:
 * (pathogen_icd11, country_iso3, metric, value, as_of).
 * admin_name and source_quote are intentionally excluded — they are verified
 * separately by the substring-verify step in the extraction runner.
 */

export interface ExtractionTuple {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors ExtractionRow field names from @ituri/extract (snake_case API contract)
  as_of: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors ExtractionRow field names from @ituri/extract (snake_case API contract)
  country_iso3: string;
  metric: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors ExtractionRow field names from @ituri/extract (snake_case API contract)
  pathogen_icd11: string;
  value: number;
}

export interface F1Result {
  f1: number;
  falseNegatives: ExtractionTuple[];
  falsePositives: ExtractionTuple[];
  precision: number;
  recall: number;
  truePositiveCount: number;
}

export function computeF1(expected: ExtractionTuple[], actual: ExtractionTuple[]): F1Result {
  const expectedKeys = new Map<string, ExtractionTuple>(expected.map((t) => [tupleKey(t), t]));
  const actualKeys = new Map<string, ExtractionTuple>(actual.map((t) => [tupleKey(t), t]));

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

function tupleKey(t: ExtractionTuple): string {
  return `${t.pathogen_icd11}|${t.country_iso3}|${t.metric}|${t.value}|${t.as_of}`;
}
