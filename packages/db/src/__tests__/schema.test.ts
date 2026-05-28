// Type-only smoke tests — no DB connection required.
import type { DocumentId, ExtractionRunId, SourceQuoteId } from "@ituri/shared";
import { describe, expectTypeOf, it } from "vitest";

import type {
  admin1,
  admin2,
  anthropicUsageLog,
  caseCounts,
  documents,
  outbreaks,
  sourceQuotes,
  sources,
} from "../schema";

describe("schema type inference", () => {
  it("sourceQuotes id column resolves to SourceQuoteId brand", () => {
    type Row = typeof sourceQuotes.$inferSelect;
    expectTypeOf<Row["id"]>().toEqualTypeOf<SourceQuoteId>();
  });

  it("sourceQuotes documentId resolves to DocumentId brand", () => {
    type Row = typeof sourceQuotes.$inferSelect;
    expectTypeOf<Row["documentId"]>().toEqualTypeOf<DocumentId>();
  });

  it("caseCounts sourceQuoteId resolves to SourceQuoteId brand", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["sourceQuoteId"]>().toEqualTypeOf<SourceQuoteId>();
  });

  it("caseCounts extractionRunId resolves to ExtractionRunId brand", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["extractionRunId"]>().toEqualTypeOf<ExtractionRunId>();
  });

  it("documents.$inferSelect includes fullTextTsv generated column", () => {
    type Row = typeof documents.$inferSelect;
    expectTypeOf<Row["fullTextTsv"]>().toExtend<null | string>();
  });

  it("documents.$inferInsert does not include fullTextTsv (generated column)", () => {
    type Insert = typeof documents.$inferInsert;
    expectTypeOf<Insert>().not.toHaveProperty("fullTextTsv");
  });

  it("sources.$inferSelect has slug and trustScore string fields", () => {
    type Row = typeof sources.$inferSelect;
    expectTypeOf<Row["slug"]>().toEqualTypeOf<string>();
    expectTypeOf<Row["trustScore"]>().toEqualTypeOf<string>();
  });

  it("sources.$inferSelect licenseTier is narrowed to the four valid tiers", () => {
    type Row = typeof sources.$inferSelect;
    expectTypeOf<Row["licenseTier"]>().toEqualTypeOf<
      "display_only" | "excluded" | "noncommercial_verified" | "open"
    >();
  });

  it("sources.$inferSelect attributionRequired is boolean", () => {
    type Row = typeof sources.$inferSelect;
    expectTypeOf<Row["attributionRequired"]>().toEqualTypeOf<boolean>();
  });

  it("admin1.$inferSelect has string code and countryIso3", () => {
    type Row = typeof admin1.$inferSelect;
    expectTypeOf<Row["code"]>().toEqualTypeOf<string>();
    expectTypeOf<Row["countryIso3"]>().toEqualTypeOf<string>();
  });

  it("admin2.$inferSelect references admin1 via admin1Code string", () => {
    type Row = typeof admin2.$inferSelect;
    expectTypeOf<Row["admin1Code"]>().toEqualTypeOf<string>();
  });

  it("caseCounts.$inferSelect has admin2Code (not admin1Code)", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["admin2Code"]>().toEqualTypeOf<null | string>();
    expectTypeOf<"admin1Code" extends keyof Row ? true : false>().toEqualTypeOf<false>();
  });

  it("outbreaks.$inferSelect has pathogenSlug and severityLevel added in phase4 migration", () => {
    type Row = typeof outbreaks.$inferSelect;
    expectTypeOf<Row["pathogenSlug"]>().toEqualTypeOf<null | string>();
    expectTypeOf<Row["severityLevel"]>().toEqualTypeOf<
      "alert" | "emergency" | "info" | "warn" | null
    >();
  });

  it("anthropicUsageLog.$inferSelect has inputTokens and outputTokens as number", () => {
    type Row = typeof anthropicUsageLog.$inferSelect;
    expectTypeOf<Row["inputTokens"]>().toEqualTypeOf<number>();
    expectTypeOf<Row["outputTokens"]>().toEqualTypeOf<number>();
    expectTypeOf<Row["extractionRunId"]>().toEqualTypeOf<null | string>();
    expectTypeOf<Row["costUsd"]>().toEqualTypeOf<null | string>();
  });
});
