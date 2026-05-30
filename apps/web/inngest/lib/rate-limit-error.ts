import { RateLimitedError } from "@ituri/ingest";
import { RetryAfterError } from "inngest";

/**
 * Re-throw err as RetryAfterError when it is a RateLimitedError; otherwise re-throw unchanged.
 *
 * Call this inside a step.run() callback so Inngest honours the upstream Retry-After header
 * instead of using its default exponential back-off. (AGENTS.md rule 15)
 */
export function translateRateLimitError(err: unknown): never {
  if (err instanceof RateLimitedError) {
    throw new RetryAfterError(
      `Rate-limited by upstream; retry after ${err.retryAfterMs}ms`,
      err.retryAfterMs,
    );
  }
  throw err instanceof Error ? err : new Error(String(err));
}
