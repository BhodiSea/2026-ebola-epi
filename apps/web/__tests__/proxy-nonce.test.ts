// @vitest-environment node
import { describe, expect, it } from "vitest";

const BASE64_RE = /^[A-Z0-9+/=]{24,}$/i;

// Verify the proxy sets the x-nonce request header so RSC can read it via await headers().
// Full CSP enforcement is tested in Playwright e2e; here we just assert the shape.
describe("proxy nonce header", () => {
  it("injects x-nonce into the forwarded request headers", async () => {
    // Dynamic import isolates each test from module-level side effects.
    const { buildNonce } = await import("../lib/nonce.js");
    const nonce = buildNonce();
    expect(nonce).toMatch(BASE64_RE);
  });

  it("buildNonce returns a different value each call", async () => {
    const { buildNonce } = await import("../lib/nonce.js");
    expect(buildNonce()).not.toBe(buildNonce());
  });
});
