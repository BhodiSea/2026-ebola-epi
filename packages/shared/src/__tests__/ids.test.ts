// Covers branded ID types in ids.ts
import { describe, expect, it } from "vitest";

import { DocumentId, ExtractionRunId, OutbreakId, SourceQuoteId, ZoneCode } from "../ids";

describe("branded ID types", () => {
  it("SourceQuoteId accepts a valid UUID", () => {
    expect(SourceQuoteId.safeParse("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11").success).toBe(true);
  });

  it("SourceQuoteId rejects a non-UUID string", () => {
    expect(SourceQuoteId.safeParse("not-a-uuid").success).toBe(false);
  });

  it("DocumentId accepts a valid UUID", () => {
    expect(DocumentId.safeParse("b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22").success).toBe(true);
  });

  it("ExtractionRunId accepts a valid UUID", () => {
    expect(ExtractionRunId.safeParse("c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33").success).toBe(true);
  });

  it("OutbreakId accepts a valid UUID", () => {
    expect(OutbreakId.safeParse("d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44").success).toBe(true);
  });

  it("ZoneCode accepts ISO 3166-2 style code", () => {
    expect(ZoneCode.safeParse("CD-IT").success).toBe(true);
  });

  it("ZoneCode accepts alphanumeric subregion", () => {
    expect(ZoneCode.safeParse("US-CA").success).toBe(true);
  });

  it("ZoneCode rejects lowercase", () => {
    expect(ZoneCode.safeParse("cd-it").success).toBe(false);
  });

  it("ZoneCode rejects plain string without hyphen", () => {
    expect(ZoneCode.safeParse("CDIT").success).toBe(false);
  });

  it("ZoneCode rejects empty string after hyphen", () => {
    expect(ZoneCode.safeParse("CD-").success).toBe(false);
  });
});
