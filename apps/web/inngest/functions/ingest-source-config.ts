// Non-server-only: importable by config unit tests without pulling in Drizzle/server-only.

export interface IngestFnConfig {
  readonly concurrency: { readonly limit: 1 };
  readonly id: string;
  readonly retries: 4;
  readonly throttle: {
    // CEL string literal — the value is `"<host>"` (with embedded double-quotes).
    // This is intentional: it evaluates as a CEL string constant, so all invocations
    // for the same host share one throttle bucket (AGENTS.md rule 15).
    readonly key: string;
    readonly limit: 2;
    readonly period: "1s";
    readonly scope: "account";
  };
}

export function buildIngestConfig(slug: string, throttleKey: string): IngestFnConfig {
  return {
    id: `ingest-${slug}`,
    retries: 4,
    concurrency: { limit: 1 },
    throttle: {
      limit: 2,
      period: "1s",
      key: `"${throttleKey}"`,
      scope: "account",
    },
  };
}

export function pollEventName(slug: string): string {
  return `ingest/${slug}.poll`;
}
