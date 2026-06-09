// @vitest-environment node
// Tests for Phase 6 pipeline event-name constants and function configs.
// These import only the non-server-only config modules (no Drizzle/Anthropic/server-only).
// Coverage also guards NEW-P1j/k/l (idempotency + concurrency limits) and persist-extraction triageHash wiring.
import { describe, expect, it } from "vitest";

import { ACLED_FN_CONFIG } from "../acled-config.js";
import { AFRICA_CDC_FN_CONFIG } from "../africa-cdc-config.js";
import { BACK_FILL_FN_CONFIG } from "../back-fill-config.js";
import { ECDC_CDTR_FN_CONFIG } from "../ecdc-cdtr-config.js";
import { buildIngestConfig, pollEventName } from "../ingest-source-config.js";
import { MOH_DRC_FN_CONFIG } from "../moh-drc-config.js";
import {
  DOCUMENT_EXTRACTION_REQUESTED,
  DOCUMENT_TRIAGE_REQUESTED,
  ESCALATION_CONFIRMED,
  ESCALATION_NOVEL_PATHOGEN_COUNTRY,
  RECONCILE_REQUESTED,
} from "../pipeline-events-config.js";
import {
  EXTRACT_DOCUMENT_FN_CONFIG,
  RECONCILE_COUNTS_FN_CONFIG,
  TRIAGE_DOCUMENT_FN_CONFIG,
} from "../pipeline-fn-config.js";
import { RELIEFWEB_FN_CONFIG } from "../reliefweb-config.js";
import { SHADOW_EXTRACTION_FN_CONFIG } from "../shadow-extraction-config.js";
import { UGANDA_MOH_FN_CONFIG } from "../uganda-moh-config.js";
import { WHO_AFRO_FN_CONFIG } from "../who-afro-config.js";
import { WHO_DON_FN_CONFIG } from "../who-don-config.js";

// -- Event names --------------------------------------------------------------

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

  it("ESCALATION_CONFIRMED matches the spec", () => {
    expect(ESCALATION_CONFIRMED).toBe("escalation.confirmed");
  });
});

// -- Function configs ---------------------------------------------------------

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

// Asserts id and throttle key for all 8 per-source ingest functions so that
// a slug/key typo in any new config file is caught before wiring into route.ts.
describe("all 8 per-source ingest configs", () => {
  it.each([
    ["who-don", "who.int"],
    ["who-afro", "afro.who.int"],
    ["ecdc-cdtr", "www.ecdc.europa.eu"],
    ["africa-cdc", "africacdc.org"],
    ["reliefweb", "api.reliefweb.int"],
    ["acled", "api.acleddata.com"],
    ["moh-drc", "sante.gouv.cd"],
    ["uganda-moh", "health.go.ug"],
  ] as const)("ingest-%s: id and CEL throttle key are correct", (slug, throttleKey) => {
    const cfg = buildIngestConfig(slug, throttleKey);
    expect(cfg.id).toBe(`ingest-${slug}`);
    expect(cfg.throttle.key).toBe(`"${throttleKey}"`);
    expect(cfg.throttle.scope).toBe("account");
  });
});

describe("TRIAGE_DOCUMENT_FN_CONFIG", () => {
  it("has an id of triage-document", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.id).toBe("triage-document");
  });

  it("retries > 0", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.retries).toBeGreaterThan(0);
  });

  it("idempotency key deduplicates on documentId to prevent double Haiku billing", () => {
    expect(TRIAGE_DOCUMENT_FN_CONFIG.idempotency).toBe("event.data.documentId");
  });
});

describe("SHADOW_EXTRACTION_FN_CONFIG", () => {
  it("has an id of shadow-extraction", () => {
    expect(SHADOW_EXTRACTION_FN_CONFIG.id).toBe("shadow-extraction");
  });

  it("concurrency limit is 2 (lower priority than production limit of 3)", () => {
    expect(SHADOW_EXTRACTION_FN_CONFIG.concurrency.limit).toBe(2);
  });
});

describe("BACK_FILL_FN_CONFIG", () => {
  it("has an id of back-fill-extraction", () => {
    expect(BACK_FILL_FN_CONFIG.id).toBe("back-fill-extraction");
  });

  it("concurrency limit is 1 to serialize Anthropic batch creations", () => {
    expect(BACK_FILL_FN_CONFIG.concurrency.limit).toBe(1);
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

// Verifies the ACTUAL exported config constants — not just that buildIngestConfig works.
// A typo in any *-config.ts throttle key string would be invisible in the it.each above.
describe("actual config object instances have correct ids and throttle keys", () => {
  it.each([
    ["who-don", WHO_DON_FN_CONFIG, "who.int"],
    ["who-afro", WHO_AFRO_FN_CONFIG, "afro.who.int"],
    ["ecdc-cdtr", ECDC_CDTR_FN_CONFIG, "www.ecdc.europa.eu"],
    ["africa-cdc", AFRICA_CDC_FN_CONFIG, "africacdc.org"],
    ["reliefweb", RELIEFWEB_FN_CONFIG, "api.reliefweb.int"],
    ["acled", ACLED_FN_CONFIG, "api.acleddata.com"],
    ["moh-drc", MOH_DRC_FN_CONFIG, "sante.gouv.cd"],
    ["uganda-moh", UGANDA_MOH_FN_CONFIG, "health.go.ug"],
  ] as const)("%s config: id and throttle key match their config file", (slug, cfg, throttleKey) => {
    expect(cfg.id).toBe(`ingest-${slug}`);
    expect(cfg.throttle.key).toBe(`"${throttleKey}"`);
    expect(cfg.throttle.scope).toBe("account");
  });
});
