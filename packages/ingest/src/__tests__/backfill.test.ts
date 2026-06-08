// lint: no-unsafe-assignment suppressed on vitest asymmetric matcher; backfill.ts naming-convention suppressed for UPPER_CASE env vars; process.env bracket notation required by noPropertyAccessFromIndexSignature (TS4111); adapter.ts member-ordering fixed
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const RE_ADAPTER_FLAG = /--adapter/;
const RE_UNKNOWN_ADAPTER = /Unknown adapter/;
const RE_EVENT_KEY = /INNGEST_EVENT_KEY/;

describe("backfill run()", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("throws when --adapter flag is missing", async () => {
    const { run } = await import("../bin/backfill.js");
    await expect(run(["node", "backfill.ts"], { INNGEST_EVENT_KEY: "key" })).rejects.toThrow(
      RE_ADAPTER_FLAG,
    );
  });

  it("throws when adapter slug is unrecognized", async () => {
    const { run } = await import("../bin/backfill.js");
    await expect(
      run(["node", "backfill.ts", "--adapter", "not-real"], { INNGEST_EVENT_KEY: "key" }),
    ).rejects.toThrow(RE_UNKNOWN_ADAPTER);
  });

  it("throws when INNGEST_EVENT_KEY is absent", async () => {
    const { run } = await import("../bin/backfill.js");
    await expect(run(["node", "backfill.ts", "--adapter", "who-don"], {})).rejects.toThrow(
      RE_EVENT_KEY,
    );
  });

  it("POSTs ingest/who-don.poll to Inngest with the event key", async () => {
    const { run } = await import("../bin/backfill.js");
    await run(["node", "backfill.ts", "--adapter", "who-don"], { INNGEST_EVENT_KEY: "test-key" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://inn.gs/e/test-key",
      expect.objectContaining({
        method: "POST",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest asymmetric matcher returns any
        body: expect.stringContaining('"ingest/who-don.poll"'),
      }),
    );
  });

  it("uses INNGEST_BASE_URL when provided", async () => {
    const { run } = await import("../bin/backfill.js");
    await run(["node", "backfill.ts", "--adapter", "who-don"], {
      INNGEST_EVENT_KEY: "key",
      INNGEST_BASE_URL: "http://localhost:8288",
    });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8288/e/key", expect.anything());
  });
});
