// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { buildCsp } from "@/lib/csp";

describe("buildCsp", () => {
  const nonce = "abc123";
  const csp = buildCsp(nonce);

  it("embeds the nonce in script-src", () => {
    expect(csp).toContain(`'nonce-${nonce}'`);
  });

  it("includes CARTO bare host in connect-src", () => {
    expect(csp).toContain("https://basemaps.cartocdn.com");
  });

  it("includes CARTO wildcard subdomain in connect-src", () => {
    expect(csp).toContain("https://*.basemaps.cartocdn.com");
  });

  it("includes AWS S3 terrain host in connect-src", () => {
    expect(csp).toContain("https://s3.amazonaws.com");
  });

  it("includes EOX Sentinel-2 host in connect-src", () => {
    expect(csp).toContain("https://tiles.maps.eox.at");
  });

  it("retains Supabase https origin in connect-src", () => {
    expect(csp).toContain("https://*.supabase.co");
  });

  it("retains Supabase wss origin in connect-src", () => {
    expect(csp).toContain("wss://*.supabase.co");
  });

  it("includes blob: in worker-src", () => {
    expect(csp).toContain("worker-src 'self' blob:");
  });

  it("defaults frame-ancestors to self", () => {
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("allows any origin for frame-ancestors in embed mode", () => {
    const embedCsp = buildCsp(nonce, true);
    expect(embedCsp).toContain("frame-ancestors *");
    expect(embedCsp).not.toContain("frame-ancestors 'self'");
  });

  it("includes unsafe-eval in script-src outside production", () => {
    // NODE_ENV in vitest is "test" — same non-production category as "development".
    // React dev runtime requires eval() to reconstruct cross-realm callstacks.
    expect(csp).toContain("'unsafe-eval'");
  });

  it("excludes unsafe-eval from script-src in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const prodCsp = buildCsp(nonce);
    vi.unstubAllEnvs();
    expect(prodCsp).not.toContain("'unsafe-eval'");
  });
});
