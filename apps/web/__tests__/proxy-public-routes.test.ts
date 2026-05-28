// @vitest-environment node
/**
 * /methods and /evidence/* are public (no auth required) — they are indexed by
 * search engines and must be accessible without a session cookie.
 */

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    ANTHROPIC_API_KEY: "sk-test",
    INNGEST_EVENT_KEY: "test-key",
    INNGEST_SIGNING_KEY: "test-signing-key",
    ARCJET_KEY: "ajkey_test",
    POSTGRES_URL_NON_POOLING: "postgresql://localhost/test",
  },
  hasEnvVars: true,
}));

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

vi.mock("@/lib/nonce", () => ({ buildNonce: () => "test-nonce" }));

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("proxy public-route allowlist", () => {
  it("does NOT redirect unauthenticated /methods — public editorial page", async () => {
    const req = makeRequest("/methods");
    const res = await updateSession(req, "nonce");
    expect(res.status).not.toBe(307);
  });

  it("does NOT redirect unauthenticated /evidence/some-uuid — public permalink", async () => {
    const req = makeRequest("/evidence/00000000-0000-0000-0000-000000000001");
    const res = await updateSession(req, "nonce");
    expect(res.status).not.toBe(307);
  });

  it("still redirects unauthenticated /protected", async () => {
    const req = makeRequest("/protected");
    const res = await updateSession(req, "nonce");
    expect(res.status).toBe(307);
  });
});
