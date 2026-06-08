// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";

import type Anthropic from "@anthropic-ai/sdk";
import type { ReconcileInput } from "@ituri/extract";
import { parseReconcileResponse } from "@ituri/extract";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(import.meta.dirname, "..", "reconcile-gold-set");
const FIXTURE_NAMES = ["clear-winner", "tied-resolvable", "unresolvable"] as const;
type FixtureName = (typeof FIXTURE_NAMES)[number];

interface ReconcileGroundTruth {
  escalate: boolean;
  reason_contains?: string;
  winner_id: null | string;
}

function loadReconcileFixture(name: FixtureName) {
  const dir = path.join(FIXTURES_DIR, name);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by parseReconcileResponse
  const groundTruth = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted FIXTURES_DIR constant
    readFileSync(path.join(dir, "ground-truth.json"), "utf8"),
  ) as ReconcileGroundTruth;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; shape validated by parseReconcileResponse
  const responseFixture = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from trusted FIXTURES_DIR constant
    readFileSync(path.join(dir, "response-fixture.json"), "utf8"),
  ) as Pick<Anthropic.Message, "content" | "usage">;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, security/detect-non-literal-fs-filename -- JSON.parse returns any; path from trusted constant
  const input = JSON.parse(readFileSync(path.join(dir, "input.json"), "utf8")) as ReconcileInput;
  return { groundTruth, responseFixture, input };
}

describe("reconcile gold-set offline accuracy", () => {
  it("clear-winner: WHO DON trust 0.95 wins over WHO AFRO trust 0.80", () => {
    const { groundTruth, responseFixture, input } = loadReconcileFixture("clear-winner");
    const { decision } = parseReconcileResponse(responseFixture, input);

    expect(decision.winner_id).toBe(groundTruth.winner_id);
    expect(decision.escalate).toBe(groundTruth.escalate);
  });

  it("tied-resolvable: identical trust — most-recent publication wins", () => {
    const { groundTruth, responseFixture, input } = loadReconcileFixture("tied-resolvable");
    const { decision } = parseReconcileResponse(responseFixture, input);

    expect(decision.winner_id).toBe(groundTruth.winner_id);
    expect(decision.escalate).toBe(groundTruth.escalate);
  });

  it("unresolvable: conflicting sources, confidence < 0.8 → escalate:true", () => {
    const { groundTruth, responseFixture, input } = loadReconcileFixture("unresolvable");
    const { decision } = parseReconcileResponse(responseFixture, input);

    expect(decision.escalate).toBe(true);
    expect(groundTruth.escalate).toBe(true);
  });

  it("suite: winner accuracy >= 0.85", () => {
    const results = FIXTURE_NAMES.map((name) => {
      const { groundTruth, responseFixture, input } = loadReconcileFixture(name);
      const { decision } = parseReconcileResponse(responseFixture, input);
      return { decision, groundTruth };
    });

    const escalateOnly = results.filter((r) => r.groundTruth.winner_id === null);
    const ranked = results.filter((r) => r.groundTruth.winner_id !== null);

    const correctWinners = ranked.filter(
      (r) => r.decision.winner_id === r.groundTruth.winner_id,
    ).length;
    const correctEscalations = escalateOnly.filter((r) => r.decision.escalate).length;

    const totalJudgeable = ranked.length + escalateOnly.length;
    const totalCorrect = correctWinners + correctEscalations;
    const accuracy = totalCorrect / totalJudgeable;

    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });
});
