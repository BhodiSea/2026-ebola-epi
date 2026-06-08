// @vitest-environment node
// Guards: credential-required adapters must throw visibly instead of silently returning [].
// Tests the makeXxxAdapter factory functions which accept injected creds.
import { describe, expect, it } from "vitest";

import { makeAcledAdapter } from "../sources/acled.js";
import { makeReliefwebAdapter } from "../sources/reliefweb.js";

describe("makeAcledAdapter credential enforcement", () => {
  it("throws on poll() when accessToken is undefined", async () => {
    const adapter = makeAcledAdapter({ accessToken: undefined, email: "test@example.com" });
    await expect(adapter.poll()).rejects.toThrow("ACLED_ACCESS_TOKEN");
  });

  it("throws on poll() when email is undefined", async () => {
    const adapter = makeAcledAdapter({ accessToken: "tok", email: undefined });
    await expect(adapter.poll()).rejects.toThrow("ACLED_EMAIL");
  });

  it("throws on fetch() when accessToken is undefined", async () => {
    const adapter = makeAcledAdapter({ accessToken: undefined, email: "test@example.com" });
    await expect(adapter.fetch("https://api.acleddata.com/acled/read?x=1")).rejects.toThrow(
      "ACLED_ACCESS_TOKEN",
    );
  });
});

describe("makeReliefwebAdapter credential enforcement", () => {
  it("throws on poll() when appname is undefined", async () => {
    const adapter = makeReliefwebAdapter({ appname: undefined });
    await expect(adapter.poll()).rejects.toThrow("RELIEFWEB_APPNAME");
  });

  it("throws on fetch() when appname is undefined", async () => {
    const adapter = makeReliefwebAdapter({ appname: undefined });
    await expect(adapter.fetch("https://reliefweb.int/report/12345")).rejects.toThrow(
      "RELIEFWEB_APPNAME",
    );
  });
});

describe("buildAdapterRegistry metadata", () => {
  it("all 8 adapters have a non-empty version string", async () => {
    const { buildAdapterRegistry } = await import("../registry.js");
    const registry = buildAdapterRegistry({});
    for (const [slug, adapter] of Object.entries(registry)) {
      expect(adapter.version, `${slug} missing version`).toBeTruthy();
    }
  });
});
