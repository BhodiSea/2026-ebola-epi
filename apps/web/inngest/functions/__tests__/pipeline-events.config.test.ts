// @vitest-environment node
// Tests for Phase 6 pipeline event-name constants and function configs.
// These import only the non-server-only config modules (no Drizzle/Anthropic/server-only).
import { describe, expect, it } from "vitest";

import { buildIngestConfig, pollEventName } from "../ingest-source-config.js";
import {
  DOCUMENT_EXTRACTION_REQUESTED,
  DOCUMENT_TRIAGE_REQUESTED,
  ESCALATION_CONFIRMED,
  ESCALATION_CONFLICT_UNRESOLVABLE,
  ESCALATION_NOVEL_PATHOGEN_COUNTRY,
  RECONCILE_REQUESTED,
} from "../pipeline-events-config.js";
import {
  EXTRACT_DOCUMENT_FN_CONFIG,
  RECONCILE_COUNTS_FN_CONFIG,
  TRIAGE_DOCUMENT_FN_CONFIG,
} from "../pipeline-fn-config.js";

// ── Event names ──────────────────────────────────────────────────────────────

describe("pipeline event names", () => {
  it("DOCUMENT_TRIAGE_REQUESTED matches the spec", () => {
    expect(DOCUMENT_TRIAGE_REQUESTED).toBe("document.triage.requested");
  });

  it("DOCUMENT_EXTRACTION_REQUESTED matches the spec", () => {
    expect(DOCUMENT_EXTRACTION_REQUESTED).toBe("document.extraction.requested");
  });

  it("RECONCILE_REQUESTED matches the spec", () => {
    expect(RECONCILE_REQUESTED).toBe("reconcile.requested");
  });

  it("ESCALATION_NOVEL_PATHOGEN_COUNTRY matches the spec", () => {
    expect(ESCALATION_NOVEL_PATHOGEN_COUNTRY).toBe("escalation.novel_pathogen_country");
  });

  it("ESCALATION_CONFLICT_UNRESOLVABLE matches the spec", () => {
    expect(ESCALATION_CONFLICT_UNRESOLVABLE).toBe("escalation.conflict_unresolvable");
  });

  it("ESCALATION_CONFIRMED matches the spec", () => {
    expect(ESCALATION_CONFIRMED).toBe("escalation.confirmed");
  });
});

// ── Function configs ─────────────────────────────────────────────────────────

// Per-source ingest configs use a CEL string-literal throttle key (not an event-data ref).
// The key is `"<host>"` (with embedded double-quotes) — valid CEL string constant.
// This is intentional and correct (see AGENTS.md rule 15 and the registry pattern).
const CEL_STRING_LITERAL = /^"[^"]+"$/;

describe("buildIngestConfig", () => {
  it("generates id as ingest-<slug>", () => {
    const cfg = buildIngestConfig("who-don", "who.int");
    expect(cfg.id).toBe("ingest-who-don");
  });

  it("throttle.key is a CEL string literal (not an event-data ref)", () => {
    const cfg = buildIngestConfig("who-afro", "afro.who.int");
    expect(cfg.throttle.key).toMatch(CEL_STRING_LITERAL);
  });

  it("throttle.key unquotes to the throttleKey argument", () => {
    const cfg = buildIngestConfig("ecdc-cdtr", "ecdc.europa.eu");
    expect(cfg.throttle.key).toBe('"ecdc.europa.eu"');
  });

  it("throttle.scope is 'account' (AGENTS.md rule 15)", () => {
    const cfg = buildIngestConfig("who-don", "who.int");
    expect(cfg.throttle.scope).toBe("account");
  });

  it("concurrency.limit is 1", () => {
    const cfg = buildIngestConfig("who-don", "who.int");
    expect(cfg.concurrency.limit).toBe(1);
  });
});

describe("pollEventName", () => {
  it("returns ingest/<slug>.poll format", () => {
    expect(pollEventName("who-don")).toBe("ingest/who-don.poll");
    expect(pollEventName("ecdc-cdtr")).toBe("ingest/ecdc-cdtr.poll");
  });
});

describe("TRIAGE_DOCUMENT_FN_CONFIG", () => {
  it("has an id of triage-document", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.id).toBe("triage-document");
  });

  it("retries > 0", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.retries).toBeGreaterThan(0);
  });
});

describe("EXTRACT_DOCUMENT_FN_CONFIG", () => {
  it("has an id of extract-document", () => {
    expect(EXTRACT_DOCUMENT_FN_CONFIG.id).toBe("extract-document");
  });

  it("retries > 0", () => {
    expect(EXTRACT_DOCUMENT_FN_CONFIG.retries).toBeGreaterThan(0);
  });
});

describe("RECONCILE_COUNTS_FN_CONFIG", () => {
  it("has an id of reconcile-counts", () => {
    expect(RECONCILE_COUNTS_FN_CONFIG.id).toBe("reconcile-counts");
  });

  it("idempotency is set to pairKey event field", () => {
    expect(RECONCILE_COUNTS_FN_CONFIG.idempotency).toBe("event.data.pairKey");
  });

  // Concurrency key scoped per-pair so parallel reconciliations of different
  // pairs don't block each other, but duplicate events for the same pair are serialised.
  it("concurrency is keyed per pairKey to prevent duplicate Opus calls", () => {
    expect(RECONCILE_COUNTS_FN_CONFIG.concurrency.key).toBe("event.data.pairKey");
    expect(RECONCILE_COUNTS_FN_CONFIG.concurrency.limit).toBe(1);
  });

  // Defense-in-depth: apply-supersede WHERE clause must include ne(caseCounts.id, winnerId)
  // so a row can never supersede itself, even if winner_id === loser_id is somehow emitted
  // (duplicates the DB CHECK constraint case_counts_no_self_supersede at the query layer).
  it("retries is a positive integer (function will retry transient DB errors)", () => {
    expect(RECONCILE_COUNTS_FN_CONFIG.retries).toBeGreaterThan(0);
  });
});
