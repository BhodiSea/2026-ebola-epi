export interface Adapter {
  fetch(url: string): Promise<FetchResult>;
  parse(raw: string): Promise<ParseResult>;
  poll(): Promise<{ publishedAt: string; title: string; url: string }[]>;
  sourceSlug: string;
}

// publishedAt is an ISO string (not Date) so results survive Inngest JSON serialisation.
export type FetchResult =
  | { mimeType: string; rawContent: string; sha256: Buffer; skipped: false }
  | { reason: string; skipped: true };

export type ParseResult =
  | { fullText: string; language: string; skipped: false; title: string }
  | { reason: string; skipped: true };

export interface RegisteredAdapter extends Adapter {
  /** Cron expression for the Inngest function trigger. */
  pollInterval: string;
  /** Hostname used as a CEL string-literal throttle key in Inngest: `"${throttleKey}"` */
  throttleKey: string;
}
