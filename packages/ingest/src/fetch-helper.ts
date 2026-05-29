import { createHash } from "node:crypto";

import robotsParser from "robots-parser";

import type { FetchResult } from "./adapter.js";

export const USER_AGENT = "ituri-sitrep/1.0 (+https://ituri-sitrep.org/about/bot)";

// Callers in Inngest functions should catch this and re-throw as inngest.RetryAfterError
// so the retry respects the upstream Retry-After header (AGENTS.md rule 15).
export class RateLimitedError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`Upstream rate limit; retry after ${retryAfterMs}ms`);
    this.name = "RateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

// In-memory robots cache keyed by origin (function-instance lifetime).
const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

export interface ConditionalGetOpts {
  etag?: null | string;
  lastModified?: Date | null;
  userAgent?: string;
}

export async function fetchWithConditionalGet(
  url: string,
  opts: ConditionalGetOpts = {},
): Promise<FetchResult> {
  const ua = opts.userAgent ?? USER_AGENT;
  const origin = new URL(url).origin;
  const robots = await getRobots(origin);

  if (robots.isAllowed(url, ua) === false) {
    throw new Error(`robots.txt disallows crawling ${url}`);
  }

  const headers = buildRequestHeaders(ua, opts);
  const res = await fetch(url, { headers });

  if (res.status === 304) {
    return { skipped: true, reason: "304 Not Modified" };
  }

  if (res.status === 429) {
    const retryAfterSec = Number.parseInt(res.headers.get("Retry-After") ?? "60", 10);
    throw new RateLimitedError(retryAfterSec * 1000);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }

  const rawContent = await res.text();
  const sha256 = createHash("sha256").update(rawContent).digest();
  const mimeType = res.headers.get("content-type") ?? "text/html";

  return { skipped: false, rawContent, sha256, mimeType };
}

export async function getRobots(origin: string): Promise<ReturnType<typeof robotsParser>> {
  const cached = robotsCache.get(origin);
  if (cached !== undefined) {
    return cached;
  }
  const robotsUrl = `${origin}/robots.txt`;
  const res = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT } });
  // Non-200 → treat as no robots.txt → allow all (RFC 9309 §2.3.1.1)
  const content = res.ok ? await res.text() : "";
  const robots = robotsParser(robotsUrl, content);
  robotsCache.set(origin, robots);
  return robots;
}

function buildRequestHeaders(ua: string, opts: ConditionalGetOpts): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": ua };
  if (opts.etag != null) {
    headers["If-None-Match"] = opts.etag;
  }
  if (opts.lastModified != null) {
    headers["If-Modified-Since"] = opts.lastModified.toUTCString();
  }
  return headers;
}
