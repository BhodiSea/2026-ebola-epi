import type { ExtractionRow } from "@ituri/extract";

// --- types --------------------------------------------------------------------

export interface FieldVariances {
  divergingMetrics: string[];
  matchedRows: number;
  mismatchedRows: number;
  totalCandidateRows: number;
  totalProductionRows: number;
}

// case_counts does not store pathogen_icd11/country_iso3 (those live on outbreaks).
// Key is metric+as_of only — sufficient for single-outbreak sitreps.
interface RowInput {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- mirrors ExtractionRow snake_case API contract
  as_of: string;
  metric: string;
}
type RowKey = `${string}|${string}`;

// eslint-disable-next-line max-statements -- two-pass map comparison; statements are sequential, not cyclomatic
export function computeFieldVariances(
  candidateRows: ExtractionRow[],
  productionRows: (RowInput & { value: number })[],
): FieldVariances {
  const prodMap = new Map(productionRows.map((r) => [rowKey(r), r.value]));
  const visitedKeys = new Set<RowKey>();
  const divergingMetrics: string[] = [];
  let matched = 0;
  let mismatched = 0;

  for (const row of candidateRows) {
    const key = rowKey(row);
    visitedKeys.add(key);
    const prodValue = prodMap.get(key);
    if (prodValue === undefined) {
      mismatched++;
      divergingMetrics.push(`${row.metric}(new)`);
      continue;
    }
    if (prodValue === row.value) {
      matched++;
    } else {
      mismatched++;
      divergingMetrics.push(`${row.metric}(${prodValue}→${row.value})`);
    }
  }

  // Production rows absent from candidate mean the candidate prompt regressed
  // and dropped metrics that were previously extracted. Count them as mismatches
  // so promotion scripts can gate on mismatchedRows > threshold.
  for (const [key, value] of prodMap) {
    if (!visitedKeys.has(key)) {
      mismatched++;
      const metric = key.split("|")[0] ?? "unknown";
      divergingMetrics.push(`${metric}(dropped:${String(value)})`);
    }
  }

  return {
    totalCandidateRows: candidateRows.length,
    totalProductionRows: productionRows.length,
    matchedRows: matched,
    mismatchedRows: mismatched,
    divergingMetrics,
  };
}

// --- pure comparison ----------------------------------------------------------

function rowKey(row: RowInput): RowKey {
  return `${row.metric}|${row.as_of}`;
}
