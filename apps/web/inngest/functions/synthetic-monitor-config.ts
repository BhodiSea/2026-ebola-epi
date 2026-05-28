/** Manual/pg_cron trigger event name. */
export const SYNTHETIC_MONITOR_EVENT = "synthetic.check" as const;

export const SYNTHETIC_MONITOR_FN_CONFIG = {
  id: "synthetic-monitor",
  retries: 0,
} as const;
