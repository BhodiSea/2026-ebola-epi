// @vitest-environment node
// Offline gold-set evaluation — no API calls, no DB. Uses pre-recorded
// tool_use response fixtures to deterministically assert F1 ≥ 0.90.
import { readFileSync } from "node:fs";
import path from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import { parseExtractionResponse } from "@ituri/extract";
import { describe, expect, it } from "vitest";

import type { ExtractionTuple } from "../lib/f1";
import { computeF1 } from "../lib/f1";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "gold-set");

function loadFixture(name: string) {
  const dir = path.join(FIXTURES_DIR, name);
  const sourceText = readFileSync(path.join(dir, "source.txt"), "utf8");
  const groundTruth = JSON.parse(
    readFileSync(path.join(dir, "ground-truth.json"), "utf8"),
  ) as ExtractionTuple[];
  const responseFixture = JSON.parse(
    readFileSync(path.join(dir, "response-fixture.json"), "utf8"),
  ) as Pick<Anthropic.Message, "content" | "usage">;
  return { sourceText, groundTruth, responseFixture };
}

function rowsToTuples(rows: ReturnType<typeof parseExtractionResponse>["rows"]): ExtractionTuple[] {
  return rows.map((r) => ({
    pathogen_icd11: r.pathogen_icd11,
    country_iso3: r.country_iso3,
    metric: r.metric,
    value: r.value,
    as_of: r.as_of,
  }));
}

describe("gold-set offline F1", () => {
  it("bundibugyo-ituri-2026-04-20: F1 >= 0.90", () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("bundibugyo-ituri-2026-04-20");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
  });

  it("no-confirmed-figures: F1 = 1.0 (empty ground truth, empty extraction)", () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("no-confirmed-figures");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBe(1);
  });
});
