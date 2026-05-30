// @vitest-environment node
import { describe, expect, it } from "vitest";

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
});
