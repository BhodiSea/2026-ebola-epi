import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { buildNonce } from "@/lib/nonce";
import { updateSession } from "@/lib/supabase/proxy";

// ─── rate-limit types ─────────────────────────────────────────────────────────

interface Limiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

interface RateLimitResult {
  limit: number;
  pending: Promise<unknown>;
  remaining: number;
  reset: number;
  success: boolean;
}

// ─── module-level singletons ──────────────────────────────────────────────────
// Reused across warm Fluid Compute invocations; lazily initialised.

let generalLimiter: Limiter | null = null;
let tileLimiter: Limiter | null = null;

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // L2 rate limiting — only runs when Upstash is configured (CDN-miss path only).
  const { general, tile } = await getOrInitLimiters();
  const limiter = pathname.startsWith("/api/mvt/") ? tile : general;
  if (limiter !== null) {
    // Take the rightmost non-empty segment: Vercel appends its own IP last,
    // making the last segment the least-spoofable client identifier.
    const id = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "anon";
    const { success, limit, remaining, reset, pending } = await limiter.limit(id);
    // Vercel Edge / Fluid Compute requires pending writes to be awaited or voided.
    void pending;
    if (!success) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      });
    }
  }

  const nonce = buildNonce();
  return await updateSession(request, nonce);
}

// ─── proxy ────────────────────────────────────────────────────────────────────

async function getOrInitLimiters(): Promise<{ general: Limiter | null; tile: Limiter | null }> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url === undefined || token === undefined) {
    return { general: null, tile: null };
  }
  if (generalLimiter === null) {
    const [{ Redis }, { Ratelimit }] = await Promise.all([
      import("@upstash/redis"),
      import("@upstash/ratelimit"),
    ]);
    const redis = new Redis({ url, token });
    // Sliding window: smooth boundary bursts for general API paths.
    generalLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(120, "60 s"),
      analytics: true,
      prefix: "ituri:rl",
    });
    // Token bucket: allows short tile-sequence bursts; maxTokens matches refill rate.
    tileLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(300, "60 s", 300),
      prefix: "ituri:rl:mvt",
    });
  }
  return { general: generalLimiter, tile: tileLimiter };
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
