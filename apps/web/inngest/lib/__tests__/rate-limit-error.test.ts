// @vitest-environment node
import { RateLimitedError } from "@ituri/ingest";
import { RetryAfterError } from "inngest";
import { describe, expect, it } from "vitest";

import { translateRateLimitError } from "@/inngest/lib/rate-limit-error";

describe("translateRateLimitError", () => {
  it("throws RetryAfterError when given a RateLimitedError", () => {
    expect(() => translateRateLimitError(new RateLimitedError(5000))).toThrow(RetryAfterError);
  });

  it("retryAfterMs from RateLimitedError is forwarded to RetryAfterError", () => {
    let caught: unknown;
    try {
      translateRateLimitError(new RateLimitedError(7500));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RetryAfterError);
    // RetryAfterError stores the value as a string (ms → serialised form); toBeInstanceOf above guards the cast
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- caught narrowed by toBeInstanceOf(); cast avoids vitest/no-conditional-expect violation
    expect((caught as RetryAfterError).retryAfter).toBeDefined();
  });

  it("re-throws a generic Error unchanged (not wrapped)", () => {
    const orig = new Error("network failure");
    let caught: unknown;
    try {
      translateRateLimitError(orig);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(orig);
    expect(caught).not.toBeInstanceOf(RetryAfterError);
  });

  it("wraps non-Error throws in an Error (defensive against throw 'string')", () => {
    expect(() => translateRateLimitError("string rejection")).toThrow(Error);
  });
});
