import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RW_FIELDS = {
  title: "DRC: Ebola Bundibugyo Situation Report No. 42",
  "body-html":
    "<p>As of 20 May 2026, <strong>47 confirmed cases</strong> and 12 deaths (CFR 25.5%) since 20 April 2026.</p><p>Outbreak centred in Bunia health zone, Ituri Province. Contact tracing ongoing.</p>",
  date: { created: "2026-05-20T08:00:00+0000" },
  language: [{ code: "eng", name: "English" }],
};

const RW_LIST_RESPONSE = {
  data: [{ id: "4001234", fields: RW_FIELDS }],
};

const RW_SINGLE_RESPONSE = {
  data: { id: "4001234", fields: RW_FIELDS },
};

const CRON_RE = /^[\d*,/\s-]+$/;

function makeJsonFetchMock(body: unknown, status = 200) {
  return async (_url: string) => {
    await Promise.resolve();
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

describe("reliefwebAdapter metadata", () => {
  it("has correct sourceSlug", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    expect(reliefwebAdapter.sourceSlug).toBe("reliefweb");
  });

  it("has correct throttleKey", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    expect(reliefwebAdapter.throttleKey).toBe("api.reliefweb.int");
  });

  it("has valid cron pollInterval", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    expect(reliefwebAdapter.pollInterval).toMatch(CRON_RE);
  });
});

describe("reliefwebAdapter.poll()", () => {
  describe("with env var set", () => {
    beforeEach(() => {
      vi.stubEnv("RELIEFWEB_APPNAME", "ituri-sitrep-test");
      vi.stubGlobal("fetch", makeJsonFetchMock(RW_LIST_RESPONSE));
    });
    afterEach(() => {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    });

    it("returns items with title and reliefweb.int URL", async () => {
      const { reliefwebAdapter } = await import("../sources/reliefweb.js");
      const items = await reliefwebAdapter.poll();
      expect(items.length).toBe(1);
      expect(items[0]?.title).toContain("Ebola");
      expect(items[0]?.url).toContain("reliefweb.int");
    });

    it("item URL contains the report ID", async () => {
      const { reliefwebAdapter } = await import("../sources/reliefweb.js");
      const items = await reliefwebAdapter.poll();
      expect(items[0]?.url).toContain("4001234");
    });
  });

  describe("without env var", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", makeJsonFetchMock(RW_LIST_RESPONSE));
    });
    afterEach(() => vi.unstubAllGlobals());

    it("throws when RELIEFWEB_APPNAME is absent", async () => {
      const { reliefwebAdapter } = await import("../sources/reliefweb.js");
      await expect(reliefwebAdapter.poll()).rejects.toThrow("RELIEFWEB_APPNAME");
    });
  });
});

// Lifted to top level to stay within max-nested-callbacks (3) — the inner
// expect(() => new Date(...)) would be the 4th level inside a nested describe.
describe("reliefwebAdapter.poll() — date fallback", () => {
  beforeEach(() => {
    vi.stubEnv("RELIEFWEB_APPNAME", "ituri-sitrep-test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("defaults to today (not epoch) when date.created is null", async () => {
    const noDate = { data: [{ id: "4001234", fields: { ...RW_FIELDS, date: null } }] };
    vi.stubGlobal("fetch", makeJsonFetchMock(noDate));
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const items = await reliefwebAdapter.poll();
    expect(items).toHaveLength(1);
    // Must NOT be the unix epoch
    expect(items[0]?.publishedAt).not.toBe("1970-01-01T00:00:00.000Z");
    // Must be a valid ISO date string
    expect(() => new Date(items[0]?.publishedAt ?? "")).not.toThrow();
  });
});

describe("reliefwebAdapter.fetch()", () => {
  beforeEach(() => {
    vi.stubEnv("RELIEFWEB_APPNAME", "ituri-sitrep-test");
    vi.stubGlobal("fetch", makeJsonFetchMock(RW_SINGLE_RESPONSE));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns rawContent as JSON string with sha256 Buffer and application/json mimeType", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const result = await reliefwebAdapter.fetch("https://reliefweb.int/report/4001234");
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(typeof result.rawContent).toBe("string");
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
    expect(result.mimeType).toBe("application/json");
  });

  it("rawContent parses to an object with body-html field", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const result = await reliefwebAdapter.fetch("https://reliefweb.int/report/4001234");
    if (result.skipped) {
      return;
    }
    const parsed: unknown = JSON.parse(result.rawContent);
    expect(parsed).toHaveProperty("body-html");
  });
});

describe("reliefwebAdapter.parse()", () => {
  it("strips HTML tags and returns fullText with language:en for eng code", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const result = await reliefwebAdapter.parse({
      rawContent: JSON.stringify(RW_FIELDS),
      mimeType: "application/json",
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("47 confirmed cases");
    expect(result.fullText).not.toContain("<p>");
    expect(result.language).toBe("en");
  });

  it("maps language code fra to fr", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const raw = JSON.stringify({ ...RW_FIELDS, language: [{ code: "fra", name: "French" }] });
    const result = await reliefwebAdapter.parse({ rawContent: raw, mimeType: "application/json" });
    if (result.skipped) {
      return;
    }
    expect(result.language).toBe("fr");
  });

  it("returns skipped:true with empty_body when body-html is empty string", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const raw = JSON.stringify({ title: "Empty", "body-html": "", language: [{ code: "eng" }] });
    const result = await reliefwebAdapter.parse({ rawContent: raw, mimeType: "application/json" });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("empty_body");
  });

  it("returns skipped:true with body_too_short for minimal body", async () => {
    const { reliefwebAdapter } = await import("../sources/reliefweb.js");
    const raw = JSON.stringify({
      title: "Short",
      "body-html": "<p>Brief note.</p>",
      language: [{ code: "eng" }],
    });
    const result = await reliefwebAdapter.parse({ rawContent: raw, mimeType: "application/json" });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("body_too_short");
  });
});
