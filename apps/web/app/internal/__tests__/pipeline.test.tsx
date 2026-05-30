import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: { INNGEST_SIGNING_KEY: "signkey-test-00000000" },
}));

describe("/internal/pipeline page", () => {
  it("exports a default async function", async () => {
    const mod = await import("../pipeline/page");
    expect(typeof mod.default).toBe("function");
  });
});
