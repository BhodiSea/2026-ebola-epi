/**
 * Returns true when two case-count values from different sources diverge enough
 * to warrant Opus reconciliation. Uses the smaller value as the denominator so
 * that 100 vs 80 (25% relative difference) crosses the threshold.
 * Formula: |a - b| / min(a, b) >= 0.25
 *
 * This matches the SQL predicate in the detect-divergence step:
 *   ABS(n.value - o.value)::numeric / LEAST(n.value, o.value)::numeric >= 0.25
 */
export function shouldReconcile(a: number, b: number): boolean {
  const min = Math.min(a, b);
  if (min === 0) {
    return false;
  }
  return Math.abs(a - b) / min >= 0.25;
}
