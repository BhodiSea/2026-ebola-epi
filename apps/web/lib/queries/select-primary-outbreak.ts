// Pure sort helper — no server-only dependency so it can be unit-tested.

export interface SortableOutbreak {
  readonly countryIso3: string;
  readonly id: string;
  readonly severityLevel: null | string;
}

/**
 * Pick the "primary" outbreak from a list of active outbreaks.
 * Sort key: severity (emergency first), then COD preferred as the primary
 * outbreak country (Ituri/DRC focus), then insertion order.
 */
export function selectPrimaryOutbreak<T extends SortableOutbreak>(outbreaks: T[]): null | T {
  if (outbreaks.length === 0) {
    return null;
  }
  return (
    [...outbreaks].sort((a, b) => {
      const sev = severityRank(a.severityLevel) - severityRank(b.severityLevel);
      if (sev !== 0) {
        return sev;
      }
      // COD (DRC/Ituri) is the primary outbreak country — prefer it on severity tie.
      if (a.countryIso3 === "COD" && b.countryIso3 !== "COD") {
        return -1;
      }
      if (b.countryIso3 === "COD" && a.countryIso3 !== "COD") {
        return 1;
      }
      return 0;
    })[0] ?? null
  );
}

const SEVERITY_RANK: Record<string, number> = {
  emergency: 0,
  alert: 1,
  warn: 2,
  info: 3,
};

function severityRank(level: null | string): number {
  return SEVERITY_RANK[level ?? "info"] ?? 3;
}
