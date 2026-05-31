// Type-only smoke tests — no DB connection required.
import type { DocumentId, ExtractionRunId, OutbreakId, SourceQuoteId } from "@ituri/shared";
import { describe, expectTypeOf, it } from "vitest";

import type {
  admin1,
  admin2,
  anthropicUsageLog,
  batchResults,
  caseCounts,
  documents,
  incidents,
  outbreaks,
  shadowResults,
  sourceQuotes,
  sources,
} from "../schema";
import type { Constants, Database, Tables } from "../types.gen";

// eslint-disable-next-line max-statements -- describe callback; rule fires on statement count, not cyclomatic complexity
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

  // ── Phase 6 additions ─────────────────────────────────────────────────────

  it("sources.$inferSelect has extractionPaused boolean (phase6 kill-switch column)", () => {
    type Row = typeof sources.$inferSelect;
    expectTypeOf<Row["extractionPaused"]>().toEqualTypeOf<boolean>();
  });

  it("documents.$inferSelect has conditional-GET columns (phase6)", () => {
    type Row = typeof documents.$inferSelect;
    expectTypeOf<Row["etag"]>().toEqualTypeOf<null | string>();
    expectTypeOf<Row["lastModified"]>().toEqualTypeOf<Date | null>();
    expectTypeOf<Row["httpStatus"]>().toEqualTypeOf<null | number>();
    expectTypeOf<Row["license"]>().toEqualTypeOf<null | string>();
  });

  it("incidents.$inferSelect has class, status, outbreakId (phase6 escalation table)", () => {
    type Row = typeof incidents.$inferSelect;
    expectTypeOf<Row["class"]>().toEqualTypeOf<
      "anomaly" | "conflict_unresolvable" | "novel_pathogen_country" | "substring_verify_fail"
    >();
    expectTypeOf<Row["status"]>().toEqualTypeOf<"acked" | "closed" | "open" | "snoozed">();
    expectTypeOf<Row["outbreakId"]>().toEqualTypeOf<null | OutbreakId>();
  });

  // ── Phase 7 additions ─────────────────────────────────────────────────────

  it("incidents.$inferSelect has detail and documentId added in phase7 migration", () => {
    type Row = typeof incidents.$inferSelect;
    expectTypeOf<Row["detail"]>().toEqualTypeOf<unknown>();
    expectTypeOf<Row["documentId"]>().toEqualTypeOf<DocumentId | null>();
  });

  it("shadowResults.$inferSelect has candidateVersion, fieldVariances, promoted (phase7 shadow-run)", () => {
    type Row = typeof shadowResults.$inferSelect;
    expectTypeOf<Row["candidateVersion"]>().toEqualTypeOf<string>();
    expectTypeOf<Row["fieldVariances"]>().toEqualTypeOf<unknown>();
    expectTypeOf<Row["promoted"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Row["productionRunId"]>().toEqualTypeOf<null | string>();
  });

  it("batchResults.$inferSelect has batchId, customId, documentId, result (phase7 back-fill)", () => {
    type Row = typeof batchResults.$inferSelect;
    expectTypeOf<Row["batchId"]>().toEqualTypeOf<string>();
    expectTypeOf<Row["customId"]>().toEqualTypeOf<string>();
    expectTypeOf<Row["documentId"]>().toEqualTypeOf<null | string>();
    expectTypeOf<Row["result"]>().toEqualTypeOf<unknown>();
  });

  it("caseCounts.$inferSelect has escalationClass nullable string (phase7 autonomy flip)", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["escalationClass"]>().toEqualTypeOf<
      | "anomaly"
      | "conflict_unresolvable"
      | "novel_pathogen_country"
      | "substring_verify_fail"
      | null
    >();
  });

  it("caseCounts.$inferInsert status defaults to 'published' (phase7 autonomy flip)", () => {
    type Insert = typeof caseCounts.$inferInsert;
    // status has a default so it should be optional in insert
    expectTypeOf<Insert["status"]>().toEqualTypeOf<string | undefined>();
  });

  // ── WS1 schema widening ───────────────────────────────────────────────────

  it("caseCounts.$inferSelect has adminName nullable string (WS1)", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["adminName"]>().toEqualTypeOf<null | string>();
  });

  it("caseCounts.$inferSelect has isNewInPeriod nullable boolean (WS1)", () => {
    type Row = typeof caseCounts.$inferSelect;
    expectTypeOf<Row["isNewInPeriod"]>().toEqualTypeOf<boolean | null>();
  });

  // ── WS2 ingest pipeline additions ─────────────────────────────────────────

  it("documents.$inferSelect has mimeType and language as nullable strings (WS2)", () => {
    type Row = typeof documents.$inferSelect;
    expectTypeOf<Row["mimeType"]>().toEqualTypeOf<null | string>();
    expectTypeOf<Row["language"]>().toEqualTypeOf<null | string>();
  });

  it("MetricLiteral is exported from @ituri/db (WS1 — used by AnomalyParams)", () => {
    type Row = typeof caseCounts.$inferSelect;
    // If MetricLiteral is exported and applied to metric column, the column type is the union.
    expectTypeOf<Row["metric"]>().toEqualTypeOf<
      | "cases"
      | "confirmed"
      | "contacts"
      | "deaths"
      | "hcw_deaths"
      | "healthcare_workers"
      | "in_treatment"
      | "lab_positive"
      | "nosocomial"
      | "probable"
      | "suspected"
      | "vaccinated"
    >();
  });
});

// ── types.gen.ts smoke tests ───────────────────────────────────────────────
// Verifies the generated Supabase type file exports are correct and complete.
// The CI types-drift gate (supabase gen types diff) is the source of truth;
// these tests verify the *shape* of the generated exports.
describe("types.gen exports", () => {
  it("Constants.public.Enums has no keys (no custom enums in schema)", () => {
    expectTypeOf<keyof (typeof Constants)["public"]["Enums"]>().toEqualTypeOf<never>();
  });

  it("Database.public.Tables includes core tables", () => {
    type PublicTables = Database["public"]["Tables"];
    expectTypeOf<"case_counts" extends keyof PublicTables ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<"sources" extends keyof PublicTables ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<"source_quotes" extends keyof PublicTables ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<"outbreaks" extends keyof PublicTables ? true : false>().toEqualTypeOf<true>();
    expectTypeOf<"documents" extends keyof PublicTables ? true : false>().toEqualTypeOf<true>();
  });

  it("Tables<'sources'> Row has license_tier string", () => {
    type SourceRow = Tables<"sources">;
    expectTypeOf<SourceRow["license_tier"]>().toEqualTypeOf<string>();
  });

  it("Tables<'case_counts'> Row has source_quote_id and prompt_version_hash", () => {
    type CaseCountRow = Tables<"case_counts">;
    expectTypeOf<CaseCountRow["source_quote_id"]>().toEqualTypeOf<string>();
    expectTypeOf<CaseCountRow["prompt_version_hash"]>().toEqualTypeOf<string>();
  });
});
