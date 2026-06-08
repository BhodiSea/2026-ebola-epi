// @vitest-environment node
// Offline triage gold-set evaluation — no API calls, no DB. Uses pre-recorded
// tool_use response fixtures to deterministically assert is_outbreak accuracy
// ≥ 0.95 and pathogen_icd11 accuracy ≥ 0.90 across 4 representative documents.
// lint: vitest/no-conditional-expect suppressed on if-guarded expects; guards are
// required for TS discriminated-union narrowing (is_outbreak checked unconditionally above).
import { readFileSync } from "node:fs";
import path from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import type { TriageOutput } from "@ituri/extract";
import { parseTriageResponse } from "@ituri/extract";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "triage-gold-set");

const FIXTURE_NAMES = [
  "who-don-bundibugyo",
  "who-routine-policy",
  "who-afro-french-bulletin",
  "novel-pathogen-country",
] as const;

type FixtureName = (typeof FIXTURE_NAMES)[number];

function loadTriageFixture(name: FixtureName) {
  const dir = path.join(FIXTURES_DIR, name);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by parseTriageResponse and TriageOutputSchema
  const groundTruth = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted fixture dir constant
    readFileSync(path.join(dir, "ground-truth.json"), "utf8"),
  ) as TriageOutput;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by parseTriageResponse before assertions
  const responseFixture = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted fixture dir constant
    readFileSync(path.join(dir, "response-fixture.json"), "utf8"),
  ) as Pick<Anthropic.Message, "content" | "usage">;
  return { groundTruth, responseFixture };
}

describe("triage gold-set offline accuracy", () => {
  it("who-don-bundibugyo: is_outbreak:true, Bundibugyo (1D60.2), COD", () => {
    const { groundTruth, responseFixture } = loadTriageFixture("who-don-bundibugyo");
    const { triage } = parseTriageResponse(responseFixture);
    expect(triage.is_outbreak).toBe(true);
    expect(triage.is_outbreak).toBe(groundTruth.is_outbreak);
    if (triage.is_outbreak && groundTruth.is_outbreak) {
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing; is_outbreak asserted true above
      expect(triage.pathogen_icd11).toBe(groundTruth.pathogen_icd11);
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing
      expect(triage.country_iso3).toBe(groundTruth.country_iso3);
    }
  });

  it("who-routine-policy: is_outbreak:false (general health guidelines)", () => {
    const { groundTruth, responseFixture } = loadTriageFixture("who-routine-policy");
    const { triage } = parseTriageResponse(responseFixture);
    expect(triage.is_outbreak).toBe(false);
    expect(triage.is_outbreak).toBe(groundTruth.is_outbreak);
  });

  it("who-afro-french-bulletin: is_outbreak:true, French language, Bundibugyo (1D60.2), COD", () => {
    const { groundTruth, responseFixture } = loadTriageFixture("who-afro-french-bulletin");
    const { triage } = parseTriageResponse(responseFixture);
    expect(triage.is_outbreak).toBe(true);
    expect(triage.is_outbreak).toBe(groundTruth.is_outbreak);
    if (triage.is_outbreak && groundTruth.is_outbreak) {
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing; is_outbreak asserted true above
      expect(triage.pathogen_icd11).toBe(groundTruth.pathogen_icd11);
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing
      expect(triage.country_iso3).toBe(groundTruth.country_iso3);
    }
  });

  it("novel-pathogen-country: novelty:new, Marburg (1C90.0), RWA (first Rwanda case)", () => {
    const { groundTruth, responseFixture } = loadTriageFixture("novel-pathogen-country");
    const { triage } = parseTriageResponse(responseFixture);
    expect(triage.is_outbreak).toBe(true);
    expect(triage.is_outbreak).toBe(groundTruth.is_outbreak);
    if (triage.is_outbreak && groundTruth.is_outbreak) {
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing; is_outbreak asserted true above
      expect(triage.pathogen_icd11).toBe(groundTruth.pathogen_icd11);
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing
      expect(triage.country_iso3).toBe(groundTruth.country_iso3);
      // eslint-disable-next-line vitest/no-conditional-expect -- if guard required for TS discriminated-union narrowing
      expect(triage.novelty).toBe("new");
    }
  });

  it("suite: is_outbreak accuracy >= 0.95, pathogen_icd11 accuracy >= 0.90", () => {
    let isOutbreakCorrect = 0;
    let pathogenCorrect = 0;
    let pathogenTotal = 0;

    for (const name of FIXTURE_NAMES) {
      const { groundTruth, responseFixture } = loadTriageFixture(name);
      const { triage } = parseTriageResponse(responseFixture);

      if (triage.is_outbreak === groundTruth.is_outbreak) {
        isOutbreakCorrect += 1;
      }
      if (groundTruth.is_outbreak) {
        pathogenTotal += 1;
        if (triage.is_outbreak && triage.pathogen_icd11 === groundTruth.pathogen_icd11) {
          pathogenCorrect += 1;
        }
      }
    }

    const isOutbreakAccuracy = isOutbreakCorrect / FIXTURE_NAMES.length;
    const pathogenAccuracy = pathogenTotal > 0 ? pathogenCorrect / pathogenTotal : 1;

    expect(isOutbreakAccuracy).toBeGreaterThanOrEqual(0.95);
    expect(pathogenAccuracy).toBeGreaterThanOrEqual(0.9);
  });
});
