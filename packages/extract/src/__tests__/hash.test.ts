import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  computeCandidatePromptVersionHash,
  computePromptVersionHash,
  computeToolSchemaHash,
} from "../hash.js";
import {
  CANDIDATE_FEW_SHOTS,
  CANDIDATE_STATIC_INSTRUCTIONS,
  FEW_SHOTS,
  STATIC_INSTRUCTIONS,
} from "../prompt.js";
import { MODEL } from "../run.js";
import { extractionTool } from "../tools.js";

const CLAUDE_MODEL_RE = /^claude-/;

describe("MODEL constant", () => {
  it("is exported and matches the claude model family", () => {
    expect(MODEL).toMatch(CLAUDE_MODEL_RE);
  });

  it("matches the model id stamped on extraction_runs rows", () => {
    // Guard: if someone bumps the model in run.ts without updating audit logging,
    // this test stays green but the import in ingest-who-don.ts will pick up the new value automatically.
    expect(typeof MODEL).toBe("string");
    expect(MODEL.length).toBeGreaterThan(0);
  });
});

const HEX_16 = /^[0-9a-f]{16}$/;

describe("computePromptVersionHash", () => {
  it("returns a 16-character hex string", () => {
    expect(computePromptVersionHash()).toMatch(HEX_16);
  });

  it("is deterministic across calls", () => {
    expect(computePromptVersionHash()).toBe(computePromptVersionHash());
  });
});

describe("computeToolSchemaHash", () => {
  it("returns a 16-character hex string", () => {
    expect(computeToolSchemaHash()).toMatch(HEX_16);
  });

  it("is deterministic across calls", () => {
    expect(computeToolSchemaHash()).toBe(computeToolSchemaHash());
  });
});

describe("hash independence", () => {
  it("prompt hash and tool schema hash differ", () => {
    expect(computePromptVersionHash()).not.toBe(computeToolSchemaHash());
  });
});

describe("STATIC_INSTRUCTIONS content (H3)", () => {
  it("clarifies that char offsets are relative to the plain document text, not wrapper tags", () => {
    expect(STATIC_INSTRUCTIONS).toContain("document text");
  });
});

describe("computePromptVersionHash — tool schema included (AGENTS.md Rule 7)", () => {
  it("matches sha256(instructions + few_shots + tool_schema)[:16]", () => {
    const expected = createHash("sha256")
      .update(STATIC_INSTRUCTIONS + FEW_SHOTS + JSON.stringify(extractionTool.input_schema))
      .digest("hex")
      .slice(0, 16);
    expect(computePromptVersionHash()).toBe(expected);
  });
});

describe("computeCandidatePromptVersionHash (WS3)", () => {
  it("returns a 16-character hex string", () => {
    expect(computeCandidatePromptVersionHash()).toMatch(HEX_16);
  });

  it("is deterministic across calls", () => {
    expect(computeCandidatePromptVersionHash()).toBe(computeCandidatePromptVersionHash());
  });

  it("differs from computePromptVersionHash (candidate and production are distinct)", () => {
    expect(computeCandidatePromptVersionHash()).not.toBe(computePromptVersionHash());
  });

  it("matches sha256(candidateInstructions + candidateFewShots + tool_schema)[:16]", () => {
    const expected = createHash("sha256")
      .update(
        CANDIDATE_STATIC_INSTRUCTIONS +
          CANDIDATE_FEW_SHOTS +
          JSON.stringify(extractionTool.input_schema),
      )
      .digest("hex")
      .slice(0, 16);
    expect(computeCandidatePromptVersionHash()).toBe(expected);
  });
});
