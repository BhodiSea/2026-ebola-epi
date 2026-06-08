// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ZoneExtractionTuple } from "../lib/f1-zone.js";
import { computeF1Zone } from "../lib/f1-zone.js";

const FIXTURE_DIR = path.join(import.meta.dirname, "..", "gold-set", "bundibugyo-ituri-2026-04-20");

function loadZoneActual(): ZoneExtractionTuple[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse returns any; shape validated by computeF1Zone
  const fixture = JSON.parse(readFileSync(path.join(FIXTURE_DIR, "response-fixture.json"), "utf8"));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-type-assertion -- fixture JSON structure; shape validated by computeF1Zone
  const extractions = fixture.content[0].input.extractions as ZoneExtractionTuple[];
  return extractions;
}

describe("zone-aware F1 scorer — bundibugyo-ituri-2026-04-20", () => {
  it("zone F1 >= 0.70 against zone ground truth", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by computeF1Zone
    const expected = JSON.parse(
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted FIXTURE_DIR constant
      readFileSync(path.join(FIXTURE_DIR, "ground-truth-zone.json"), "utf8"),
    ) as ZoneExtractionTuple[];
    const actual = loadZoneActual();
    const { f1 } = computeF1Zone(expected, actual);
    expect(f1).toBeGreaterThanOrEqual(0.7);
  });

  it("zone F1 drops when admin_names are stripped (regression check)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by computeF1Zone
    const expected = JSON.parse(
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted FIXTURE_DIR constant
      readFileSync(path.join(FIXTURE_DIR, "ground-truth-zone.json"), "utf8"),
    ) as ZoneExtractionTuple[];
    const actual = loadZoneActual();

    // Strip admin_name from actual — simulates a model regression
    const stripped = actual.map(({ admin_name: _, ...rest }) => rest);
    const { f1 } = computeF1Zone(expected, stripped);

    // Without admin_name, many tuples differ in key → F1 should fall
    expect(f1).toBeLessThan(0.7);
  });
});
