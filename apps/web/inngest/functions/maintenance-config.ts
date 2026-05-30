// Non-server-only: importable by config unit tests without pulling in Drizzle/Anthropic/server-only.

export const MAINTENANCE_FN_CONFIG = {
  id: "maintenance",
  retries: 2,
} as const;

export const MAINTENANCE_CRON = { cron: "0 3 * * 0" } as const;
