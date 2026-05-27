import type { DocumentId, ExtractionRunId, OutbreakId, SourceQuoteId } from "@ituri/shared";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigserial,
  char,
  customType,
  date,
  geometry,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ─── custom types ─────────────────────────────────────────────────────────────

const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
});

// tsvector is read-only in Drizzle (always generated); use string in TS since
// the driver returns a Postgres tsvector serialisation.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

// ─── geo schema ───────────────────────────────────────────────────────────────

const geoSchema = pgSchema("geo");

export const admin1 = geoSchema.table("admin1", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  countryIso3: char("country_iso3", { length: 3 }).notNull(),
  geom: geometry("geom", { type: "MultiPolygon", srid: 4326 }),
});

export const admin2 = geoSchema.table("admin2", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  admin1Code: text("admin1_code")
    .notNull()
    .references(() => admin1.code),
  geom: geometry("geom", { type: "MultiPolygon", srid: 4326 }),
});

// ─── public schema ────────────────────────────────────────────────────────────

export const sources = pgTable("sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  trustScore: numeric("trust_score", { precision: 3, scale: 2 }).notNull().default("1.00"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom().$type<DocumentId>(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => sources.id),
  sha256: bytea("sha256").unique().notNull(),
  url: text("url").notNull(),
  fullText: text("full_text").notNull(),
  // Generated column — 'simple' config required for FR/EN mixed corpus (MoH DRC, WHO AFRO).
  // Queries must use plainto_tsquery('simple', ...) not the default 'english' parser.
  fullTextTsv: tsvector("full_text_tsv").generatedAlwaysAs(sql`to_tsvector('simple', full_text)`),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  ingestedAt: timestamp("ingested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const sourceQuotes = pgTable("source_quotes", {
  id: uuid("id").primaryKey().defaultRandom().$type<SourceQuoteId>(),
  documentId: uuid("document_id")
    .notNull()
    .$type<DocumentId>()
    .references(() => documents.id, { onDelete: "cascade" }),
  charStart: integer("char_start").notNull(),
  charEnd: integer("char_end").notNull(),
  quoteText: text("quote_text").notNull(),
  embedding: vector("embedding", { dimensions: 1024 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const outbreaks = pgTable("outbreaks", {
  id: uuid("id").primaryKey().defaultRandom().$type<OutbreakId>(),
  pathogenIcd11: text("pathogen_icd11").notNull(),
  countryIso3: char("country_iso3", { length: 3 }).notNull(),
  onsetDate: date("onset_date", { mode: "date" }).notNull(),
  name: text("name"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// ─── audit schema ─────────────────────────────────────────────────────────────

const auditSchema = pgSchema("audit");

export const extractionRuns = auditSchema.table("extraction_runs", {
  id: uuid("id").primaryKey().defaultRandom().$type<ExtractionRunId>(),
  documentId: uuid("document_id").notNull().$type<DocumentId>(),
  sourceQuoteIds: uuid("source_quote_ids")
    .array()
    .notNull()
    .$type<SourceQuoteId[]>()
    .default(sql`'{}'::uuid[]`),
  modelId: text("model_id").notNull(),
  promptVersionHash: text("prompt_version_hash").notNull(),
  toolSchemaHash: text("tool_schema_hash").notNull(),
  schemaVersion: text("schema_version").notNull().default("1"),
  temperature: numeric("temperature", { precision: 3, scale: 2 }),
  inputDocSha256: bytea("input_doc_sha256"),
  cacheReadInputTokens: integer("cache_read_input_tokens").notNull().default(0),
  cacheCreationInputTokens: integer("cache_creation_input_tokens").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  rowsExtracted: integer("rows_extracted").notNull().default(0),
  rowsVerified: integer("rows_verified").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const agentActions = auditSchema.table("agent_actions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  agent: text("agent").notNull(),
  action: text("action").notNull(),
  subjectTable: text("subject_table"),
  subjectId: uuid("subject_id"),
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  traceId: text("trace_id"),
  ts: timestamp("ts", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// ─── public.case_counts ───────────────────────────────────────────────────────
// Declared after audit.extraction_runs to satisfy the forward reference.

export const caseCounts = pgTable("case_counts", {
  id: uuid("id").primaryKey().defaultRandom(),
  outbreakId: uuid("outbreak_id")
    .notNull()
    .$type<OutbreakId>()
    .references(() => outbreaks.id),
  asOf: date("as_of", { mode: "date" }).notNull(),
  admin1Code: text("admin1_code").references(() => admin1.code),
  metric: text("metric").notNull(),
  value: integer("value").notNull(),
  sourceQuoteId: uuid("source_quote_id")
    .notNull()
    .$type<SourceQuoteId>()
    .references(() => sourceQuotes.id),
  extractionRunId: uuid("extraction_run_id")
    .notNull()
    .$type<ExtractionRunId>()
    .references(() => extractionRuns.id),
  modelId: text("model_id").notNull(),
  promptVersionHash: text("prompt_version_hash").notNull(),
  supersededBy: uuid("superseded_by").references((): AnyPgColumn => caseCounts.id),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
