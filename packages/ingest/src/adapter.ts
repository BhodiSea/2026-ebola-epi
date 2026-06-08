export interface Adapter {
  fetch(url: string): Promise<FetchResult>;
  parse(input: ParseInput): Promise<ParseResult>;
  poll(): Promise<{ publishedAt: string; title: string; url: string }[]>;
  sourceSlug: string;
}

// publishedAt is an ISO string (not Date) so results survive Inngest JSON serialisation.
export type FetchResult =
  | { mimeType: string; rawBytes?: Uint8Array; rawContent: string; sha256: Buffer; skipped: false }
  | { reason: string; skipped: true };

/**
 * Input to Adapter.parse(). rawBytes is populated for application/pdf responses;
 * rawContent is populated for all HTML/JSON responses (empty string for PDFs).
 * Check `rawBytes !== undefined` to branch on PDF.
 */
export interface ParseInput {
  mimeType: string;
  rawBytes?: Uint8Array;
  rawContent: string;
}

export type ParseResult =
  | { fullText: string; language: string; skipped: false; title: string }
  | { reason: string; skipped: true };

export interface RegisteredAdapter extends Adapter {
  /** Cron expression for the Inngest function trigger. */
  pollInterval: string;
  /** Hostname used as a CEL string-literal throttle key in Inngest: `"${throttleKey}"` */
  throttleKey: string;
  /** Semver string written to sources.parser_version after each successful poll. */
  version: string;
}
