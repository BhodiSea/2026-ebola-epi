// lint: vitest/no-conditional-expect — restructured expects to use early returns
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACLED_EVENTS = [
  {
    event_id_cnty: "DRC1234",
    event_date: "2026-05-18",
    event_type: "Violence against civilians",
    sub_event_type: "Attack",
    country: "Democratic Republic of Congo",
    admin1: "Ituri",
    admin2: "Bunia",
    admin3: "",
    location: "Bunia",
    latitude: "1.5583",
    longitude: "30.2527",
    fatalities: "3",
    notes: "Armed group attacked village near Bunia during evacuation.",
  },
  {
    event_id_cnty: "DRC1235",
    event_date: "2026-05-19",
    event_type: "Riots",
    sub_event_type: "Violent demonstration",
    country: "Democratic Republic of Congo",
    admin1: "Ituri",
    admin2: "Irumu",
    admin3: "",
    location: "Komanda",
    latitude: "1.7333",
    longitude: "29.7333",
    fatalities: "0",
    notes: "Protest near health facility.",
  },
];

const ACLED_RESPONSE = { data: ACLED_EVENTS, status: { code: 200 } };
const ACLED_EMPTY_RESPONSE = { data: [], status: { code: 200 } };

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

describe("acledAdapter metadata", () => {
  it("has correct sourceSlug", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    expect(acledAdapter.sourceSlug).toBe("acled");
  });

  it("has correct throttleKey", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    expect(acledAdapter.throttleKey).toBe("api.acleddata.com");
  });

  it("has valid cron pollInterval", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    expect(acledAdapter.pollInterval).toMatch(CRON_RE);
  });
});

describe("acledAdapter.poll()", () => {
  describe("with env vars set", () => {
    beforeEach(() => {
      vi.stubEnv("ACLED_ACCESS_TOKEN", "test-token");
      vi.stubEnv("ACLED_EMAIL", "test@example.com");
    });
    afterEach(() => vi.unstubAllEnvs());

    it("returns one synthetic item per poll run", async () => {
      const { acledAdapter } = await import("../sources/acled.js");
      const items = await acledAdapter.poll();
      expect(items).toHaveLength(1);
    });

    it("item URL contains acleddata.com", async () => {
      const { acledAdapter } = await import("../sources/acled.js");
      const items = await acledAdapter.poll();
      expect(items[0]?.url).toContain("acleddata.com");
    });

    it("item URL does NOT contain credentials", async () => {
      const { acledAdapter } = await import("../sources/acled.js");
      const items = await acledAdapter.poll();
      expect(items[0]?.url).not.toContain("test-token");
      expect(items[0]?.url).not.toContain("test@example.com");
    });
  });

  describe("with env vars absent", () => {
    it("throws when ACLED_ACCESS_TOKEN is absent", async () => {
      const { acledAdapter } = await import("../sources/acled.js");
      await expect(acledAdapter.poll()).rejects.toThrow("ACLED_ACCESS_TOKEN");
    });
  });
});

describe("acledAdapter.fetch()", () => {
  beforeEach(() => {
    vi.stubEnv("ACLED_ACCESS_TOKEN", "test-token");
    vi.stubEnv("ACLED_EMAIL", "test@example.com");
    vi.stubGlobal("fetch", makeJsonFetchMock(ACLED_RESPONSE));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns skipped:false with rawContent JSON string and sha256 Buffer", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    const result = await acledAdapter.fetch(
      // eslint-disable-next-line no-secrets/no-secrets
      "https://api.acleddata.com/acled/read?country=Democratic+Republic+of+Congo%7CUganda&event_date=2026-04-20%7C2026-05-20",
    );
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(typeof result.rawContent).toBe("string");
    expect(result.sha256).toBeInstanceOf(Buffer);
    expect(result.sha256.length).toBe(32);
  });
});

describe("acledAdapter.parse()", () => {
  it("formats events as text lines with correct fields", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    const result = await acledAdapter.parse({
      rawContent: JSON.stringify(ACLED_RESPONSE),
      mimeType: "application/json",
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }
    expect(result.fullText).toContain("2026-05-18");
    expect(result.fullText).toContain("Violence against civilians");
    expect(result.fullText).toContain("Bunia");
    expect(result.language).toBe("en");
  });

  it("returns skipped:true with no_events_in_window for empty data array", async () => {
    const { acledAdapter } = await import("../sources/acled.js");
    const result = await acledAdapter.parse({
      rawContent: JSON.stringify(ACLED_EMPTY_RESPONSE),
      mimeType: "application/json",
    });
    expect(result.skipped).toBe(true);
    if (!result.skipped) {
      return;
    }
    expect(result.reason).toBe("no_events_in_window");
  });
});
