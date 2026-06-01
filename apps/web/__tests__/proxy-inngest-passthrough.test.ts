// @vitest-environment node
// WS3: shadow-extraction call site updated to buildExtractionParams(fullText, "candidate"); covered by params-builder.test.ts
/**
 * /api/inngest must not be auth-gated: Inngest server calls it with signing-key
 * verification, not user cookies. A redirect to /auth/login breaks syncing.
 */

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/proxy";

// Stub env so the proxy module loads without real Supabase credentials.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
    ANTHROPIC_API_KEY: "sk-test",
    INNGEST_EVENT_KEY: "test-key",
    INNGEST_SIGNING_KEY: "test-signing-key",
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

describe("proxy auth redirect", () => {
  it("redirects unauthenticated requests to /protected to /auth/login", async () => {
    const req = makeRequest("/protected");
    const res = await updateSession(req, "nonce");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/login");
  });

  it("does NOT redirect /api/inngest — Inngest verifies via signing key, not cookies", async () => {
    const req = makeRequest("/api/inngest");
    const res = await updateSession(req, "nonce");
    expect(res.status).not.toBe(307);
  });
});
