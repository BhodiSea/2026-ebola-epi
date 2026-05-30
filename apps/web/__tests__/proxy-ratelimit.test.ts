// @vitest-environment node
/**
 * proxy.ts L2 rate limiting: Upstash sliding-window (general) and token-bucket (MVT tiles).
 * When UPSTASH_REDIS_REST_URL is unset the rate-limiter is a no-op — verified here.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// ── Stubs ──────────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    ANTHROPIC_API_KEY: "sk-test",
    INNGEST_EVENT_KEY: "test-key",
    INNGEST_SIGNING_KEY: "test-signing-key",
    POSTGRES_URL_NON_POOLING: "postgresql://localhost/test",
    UPSTASH_REDIS_REST_URL: undefined,
    UPSTASH_REDIS_REST_TOKEN: undefined,
  },
  hasEnvVars: true,
}));

vi.mock("@/lib/nonce", () => ({ buildNonce: () => "test-nonce" }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => {
        await Promise.resolve();
        return { data: { claims: null }, error: null };
      },
    },
  }),
}));

// Upstash is not configured in this test — the rate-limiter should be a no-op.
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: vi.fn() } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    static tokenBucket() {
      return {};
    }
    async limit() {
      return { success: true };
    }
  },
}));

// eslint-disable-next-line sonarjs/no-hardcoded-ip -- test helper; 1.2.3.4 is a documentation-range IP
function makeRequest(pathname: string, ip = "1.2.3.4"): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`), {
    headers: { "x-forwarded-for": ip },
  });
}

describe("proxy rate-limit — no-op when UPSTASH env unset", () => {
  it("passes through /api/mvt requests when Upstash is not configured", async () => {
    const { proxy } = await import("../proxy");
    const req = makeRequest("/api/mvt/10/512/512.pbf");
    const res = await proxy(req);
    expect(res.status).not.toBe(429);
  });

  it("passes through general API requests when Upstash is not configured", async () => {
    const { proxy } = await import("../proxy");
    const req = makeRequest("/api/zone-totals");
    const res = await proxy(req);
    expect(res.status).not.toBe(429);
  });
});
