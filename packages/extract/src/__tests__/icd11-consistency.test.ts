// lint: functional/no-loop-statements suppressed on for-of loops (Biome noForEach conflicts); expect-expect suppressed on assertAllCodesAuthoritative helper; n/settings Node 22
import { describe, expect, it } from "vitest";

import { reconcileTool } from "../agents/reconcile-tool.js";
import { TRIAGE_FEW_SHOTS, TRIAGE_SYSTEM } from "../agents/triage-prompt.js";
import { triageTool } from "../agents/triage-tool.js";
import { PATHOGEN_ICD11, PATHOGEN_SLUG } from "../icd11.js";
import {
  CANDIDATE_FEW_SHOTS,
  CANDIDATE_STATIC_INSTRUCTIONS,
  FEW_SHOTS,
  STATIC_INSTRUCTIONS,
} from "../prompt.js";

// Matches ICD-11 coded entities (e.g. 1D60.2, 1C90.0, 1E71, 1A00)
// and MMS taxon codes (e.g. XN0AT).
// Two families:
//   - [A-Z]{2}[0-9][A-Z]{2}  → MMS codes like XN0AT
//   - [0-9][A-Z][0-9]{2}(?:\.[0-9])?  → coded entities like 1D60.2, 1C11
const ICD11_PATTERN = /\b([A-Z]{2}\d[A-Z]{2}|\d[A-Z]\d{2}(?:\.\d)?)\b/g;
const SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

function extractICD11CodesFromText(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(ICD11_PATTERN)]
        .map((m) => m[1])
        .filter((code): code is string => code !== undefined),
    ),
  ];
}

const AUTHORITATIVE_CODES = new Set<string>(Object.values(PATHOGEN_ICD11));

function assertAllCodesAuthoritative(text: string, label: string) {
  // eslint-disable-next-line functional/no-loop-statements -- Biome noForEach reverts .forEach() to for-of; suppression is the only stable fix
  for (const code of extractICD11CodesFromText(text)) {
    expect(
      AUTHORITATIVE_CODES.has(code),
      `${label} contains ICD-11 code "${code}" not in PATHOGEN_ICD11 table`,
    ).toBe(true);
  }
}

describe("PATHOGEN_SLUG", () => {
  it("has a slug entry for every value in PATHOGEN_ICD11", () => {
    // eslint-disable-next-line functional/no-loop-statements -- Biome noForEach reverts .forEach() to for-of
    for (const code of Object.values(PATHOGEN_ICD11)) {
      expect(
        Object.hasOwn(PATHOGEN_SLUG, code),
        `PATHOGEN_SLUG is missing entry for ICD-11 code "${code}"`,
      ).toBe(true);
    }
  });

  it("all slug values are URL-safe kebab-case strings", () => {
    // eslint-disable-next-line functional/no-loop-statements -- Biome noForEach reverts .forEach() to for-of
    for (const slug of Object.values(PATHOGEN_SLUG)) {
      expect(slug).toMatch(SLUG_PATTERN);
    }
  });

  it("maps 1D60.2 to bundibugyo (the active Ituri outbreak pathogen)", () => {
    expect(PATHOGEN_SLUG["1D60.2"]).toBe("bundibugyo");
  });
});

describe("ICD-11 code consistency across triage and extraction prompts", () => {
  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("TRIAGE_SYSTEM codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(TRIAGE_SYSTEM, "TRIAGE_SYSTEM");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("TRIAGE_FEW_SHOTS codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(TRIAGE_FEW_SHOTS, "TRIAGE_FEW_SHOTS");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("STATIC_INSTRUCTIONS codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(STATIC_INSTRUCTIONS, "STATIC_INSTRUCTIONS");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("FEW_SHOTS codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(FEW_SHOTS, "FEW_SHOTS");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("CANDIDATE_STATIC_INSTRUCTIONS codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(CANDIDATE_STATIC_INSTRUCTIONS, "CANDIDATE_STATIC_INSTRUCTIONS");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("CANDIDATE_FEW_SHOTS codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(CANDIDATE_FEW_SHOTS, "CANDIDATE_FEW_SHOTS");
  });

  it("STATIC_INSTRUCTIONS mentions every code in PATHOGEN_ICD11", () => {
    // eslint-disable-next-line functional/no-loop-statements -- see top-of-file lint note
    for (const code of Object.values(PATHOGEN_ICD11)) {
      expect(
        STATIC_INSTRUCTIONS.includes(code),
        `STATIC_INSTRUCTIONS is missing ICD-11 code "${code}"`,
      ).toBe(true);
    }
  });

  it("CANDIDATE_STATIC_INSTRUCTIONS mentions every code in PATHOGEN_ICD11", () => {
    // eslint-disable-next-line functional/no-loop-statements -- see top-of-file lint note
    for (const code of Object.values(PATHOGEN_ICD11)) {
      expect(
        CANDIDATE_STATIC_INSTRUCTIONS.includes(code),
        `CANDIDATE_STATIC_INSTRUCTIONS is missing ICD-11 code "${code}"`,
      ).toBe(true);
    }
  });

  it("triage codes and extraction codes are from the same code family", () => {
    const triageCodes = [
      ...extractICD11CodesFromText(TRIAGE_SYSTEM),
      ...extractICD11CodesFromText(TRIAGE_FEW_SHOTS),
    ];
    const extractionCodes = [
      ...extractICD11CodesFromText(STATIC_INSTRUCTIONS),
      ...extractICD11CodesFromText(FEW_SHOTS),
    ];
    // eslint-disable-next-line functional/no-loop-statements -- Biome noForEach reverts .forEach() to for-of
    for (const code of [...triageCodes, ...extractionCodes]) {
      expect(
        AUTHORITATIVE_CODES.has(code),
        `Code "${code}" found in prompts but not in PATHOGEN_ICD11`,
      ).toBe(true);
    }
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("triageTool.description codes are all in the PATHOGEN_ICD11 table (guards against XN0AT regression)", () => {
    assertAllCodesAuthoritative(triageTool.description, "triageTool.description");
  });

  // eslint-disable-next-line vitest/expect-expect -- assertions inside assertAllCodesAuthoritative helper
  it("reconcileTool.description codes are all in the PATHOGEN_ICD11 table", () => {
    assertAllCodesAuthoritative(reconcileTool.description, "reconcileTool.description");
  });
});
