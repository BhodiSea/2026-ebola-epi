import { readFileSync } from "node:fs";

import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { runExtraction } from "../run.js";

const FIXTURE_PATH = new URL(
  "../../../../../evals/gold-set/bundibugyo-ituri-2026-04-20/source.txt",
  import.meta.url,
);

// Integration test — skipped unless ANTHROPIC_API_KEY is present in the environment.
// This is the only observable proof that the ttl:"1h" cache block produces a real
// cache hit under live conditions. Run with:
//   ANTHROPIC_API_KEY=... pnpm vitest run packages/extract/src/__tests__/cache-round-trip.test.ts
// biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation
// eslint-disable-next-line n/no-process-env -- integration flag; no env schema available in packages/
const apiKey = process.env["ANTHROPIC_API_KEY"];

describe.skipIf(apiKey === undefined)("cache round-trip (live API)", () => {
  it("second extraction reports cache_read_input_tokens > 0 and extractions are identical", async () => {
    const client = new Anthropic({ apiKey });
    // eslint-disable-next-line n/no-sync, security/detect-non-literal-fs-filename -- test fixture only
    const documentText = readFileSync(FIXTURE_PATH, "utf8");

    const first = await runExtraction(client, documentText);
    const second = await runExtraction(client, documentText);

    expect(second.usage.cache_read_input_tokens).toBeGreaterThan(0);
    expect(second.rows).toEqual(first.rows);
  }, 60_000);
});
