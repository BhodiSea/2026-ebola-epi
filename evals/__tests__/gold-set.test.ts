// @vitest-environment node
// Offline gold-set evaluation — no API calls, no DB. Uses pre-recorded
// tool_use response fixtures to deterministically assert F1 ≥ 0.90.
// Set PERSIST_EVAL_SCORES=1 to write scores to public.extraction_eval_scores.
// WS1: schema now uses admin_name (renamed from admin1_name); F1 scoring is admin-blind.
// Regen fixtures: pnpm --filter=@ituri/evals regen (uses runExtraction — same code path as extract-document.ts).
import { readFileSync } from "node:fs";
import path from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import { parseExtractionResponse } from "@ituri/extract";
import { describe, expect, it } from "vitest";

import type { ExtractionTuple } from "../lib/f1";
import { computeF1 } from "../lib/f1";

async function persistEvalScore(sourceSlug: string, metric: string, score: number) {
  if (process.env["PERSIST_EVAL_SCORES"] !== "1") {
    return;
  }
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (supabaseUrl === undefined || serviceKey === undefined) {
    console.warn(
      "[evals] PERSIST_EVAL_SCORES=1 but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — skipping persist",
    );
    return;
  }
  const runId = crypto.randomUUID();
  const res = await fetch(`${supabaseUrl}/rest/v1/extraction_eval_scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ run_id: runId, metric, score, source_slug: sourceSlug }),
  });
  if (!res.ok) {
    console.warn(`[evals] persist failed: ${res.status} ${await res.text()}`);
  }
}

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "gold-set");

function loadFixture(name: string) {
  const dir = path.join(FIXTURES_DIR, name);
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted fixture dir constant
  const sourceText = readFileSync(path.join(dir, "source.txt"), "utf8");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by F1 scorer at runtime
  const groundTruth = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted fixture dir constant
    readFileSync(path.join(dir, "ground-truth.json"), "utf8"),
  ) as ExtractionTuple[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by parseExtractionResponse before assertions
  const responseFixture = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted fixture dir constant
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
  it("bundibugyo-ituri-2026-04-20: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("bundibugyo-ituri-2026-04-20");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("bundibugyo-ituri-2026-04-20", "f1", result.f1);
  });

  it("no-confirmed-figures: F1 = 1.0 (empty ground truth, empty extraction)", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("no-confirmed-figures");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBe(1);
    await persistEvalScore("no-confirmed-figures", "f1", result.f1);
  });

  it("cholera-cod-2024: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("cholera-cod-2024");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("cholera-cod-2024", "f1", result.f1);
  });

  it("ebola-sudan-ssd-2022: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("ebola-sudan-ssd-2022");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("ebola-sudan-ssd-2022", "f1", result.f1);
  });

  it("ebola-zaire-cod-2019: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("ebola-zaire-cod-2019");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("ebola-zaire-cod-2019", "f1", result.f1);
  });

  it("marburg-tz-2026-05-01: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("marburg-tz-2026-05-01");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("marburg-tz-2026-05-01", "f1", result.f1);
  });

  it("mpox-cod-2023: F1 >= 0.90", async () => {
    const { sourceText, groundTruth, responseFixture } = loadFixture("mpox-cod-2023");
    const { rows } = parseExtractionResponse(responseFixture, sourceText);
    const result = computeF1(groundTruth, rowsToTuples(rows));
    expect(result.f1).toBeGreaterThanOrEqual(0.9);
    await persistEvalScore("mpox-cod-2023", "f1", result.f1);
  });
});
