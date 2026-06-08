// @vitest-environment node
/**
 * ituri-sitrep is a public situational-awareness tool. Only /internal/* routes
 * require authentication. All public-facing pages must be accessible without a
 * session cookie so they are indexable and reachable by the general public.
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

const PUBLIC_ROUTES = [
  "/",
  "/today",
  "/map",
  "/sitreps",
  "/outbreaks",
  "/methods",
  "/evidence/00000000-0000-0000-0000-000000000001",
  "/about/data-sources",
  "/brief/2026-05-28",
  "/zone/COD-IT-IR",
  "/auth/login",
  "/auth/callback",
  "/api/inngest",
];

describe("proxy public-route allowlist — no redirect for unauthenticated users", () => {
  for (const route of PUBLIC_ROUTES) {
    it(`does NOT redirect unauthenticated ${route}`, async () => {
      const req = makeRequest(route);
      const res = await updateSession(req, "nonce");
      expect(res.status).not.toBe(307);
    });
  }
});

describe("proxy auth guard — /internal/* requires authentication", () => {
  it("redirects unauthenticated /internal/pipeline to /auth/login", async () => {
    const req = makeRequest("/internal/pipeline");
    const res = await updateSession(req, "nonce");
    expect(res.status).toBe(307);
  });

  it("redirects unauthenticated /internal/sources to /auth/login", async () => {
    const req = makeRequest("/internal/sources");
    const res = await updateSession(req, "nonce");
    expect(res.status).toBe(307);
  });
});
