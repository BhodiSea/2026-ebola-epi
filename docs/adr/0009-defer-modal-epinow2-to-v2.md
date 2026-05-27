# 0009 — Defer EpiNow2 Rt nowcasting to v2

Date: 2026-05-27
Status: Accepted
Deciders: Thomas Nicklin

## Context and Problem Statement

The 2026 Ituri Bundibugyo virus outbreak does not yet have 14 consecutive days of daily case-count observations, which is the minimum required for stable Rt estimation via EpiNow2. Running epinowcast/EpiNow2 via Modal + rpy2 would introduce significant operational complexity (Modal cold-start latency, R runtime dependency, GPU allocation) with no signal value during the data-sparse early phase.

## Decision Drivers

- EpiNow2 requires a minimum of 14 days of consistent daily incidence data to produce stable Rt estimates; the current dataset does not meet this threshold.
- Modal cold-start + R runtime overhead adds > 30 s latency per run, not warranted until estimates are statistically meaningful.
- The data architecture (`rolling_z_score` columns in `case_counts`, `audit.agent_actions` for all compute provenance) accommodates Rt columns without a schema migration when the time comes.
- v1 scope is map-first situational awareness, not forecasting.

## Considered Options

1. **Implement Rt nowcasting in v1** using Modal + rpy2 + epinowcast.
2. **Defer to v2** until ≥ 14 daily observations exist and the outbreak has stabilized enough to warrant real-time Rt.
3. **Use a simpler Rt approximation** (e.g. 7-day rolling ratio) in v1 as a placeholder.

## Decision Outcome

**Option 2 — Defer to v2.**

Adding a `Rt nowcast` placeholder in the Timeline tab of the `/map` inspector is sufficient for v1. The placeholder displays "Coming in v2" and does not attempt estimation. The `case_counts` table schema reserves space for `rt_mean` and `rt_ci_lower`/`rt_ci_upper` columns (added as nullable) in Phase 6 without breaking any v1 query.

### Positive Consequences

- v1 ships without Modal, rpy2, or R runtime dependencies — reduces operational surface and infra cost.
- No premature column design for Rt estimates before the signal exists.
- When v2 adds Rt: the `audit.agent_actions` pattern handles provenance automatically; the UI placeholder becomes a live component with zero routing changes.

### Negative Consequences

- No Rt estimates in v1. Sitrep consumers who want Rt must refer to WHO/AFRO reports directly.
- The Timeline tab placeholder may confuse users unfamiliar with data-sparsity requirements for Rt estimation.

## Links

- [Phase 0 spec](../../docs/v1/phase-0-monorepo-and-cicd.md)
- [ADR-0007](./0007-pnpm-monorepo-staging.md) — pnpm monorepo decision (provides the architecture context for `audit.agent_actions`)
