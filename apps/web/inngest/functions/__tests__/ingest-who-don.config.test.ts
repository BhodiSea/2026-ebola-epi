// @vitest-environment node
// MIGRATED (Phase 6): who-don now uses buildIngestConfig like all per-source ingest functions.
// throttle.key is a CEL string literal `"who.int"` — NOT an event-data ref.
// Cron-triggered events have no event.data fields; an event-data ref would evaluate
// to null for every invocation, collapsing all sources into a single null throttle bucket.
// A static CEL string literal ensures per-host isolation across concurrent function instances.
// AGENTS.md rule 15: never use in-process p-throttle.
import { describe, expect, it } from "vitest";

import { WHO_DON_FN_CONFIG, WHO_DON_POLL_EVENT } from "../who-don-config.js";

// CEL string literal: `"<host>"` — value surrounded by double-quotes.
const CEL_STRING_LITERAL = /^"[^"]+"$/;

describe("ingestWHODON function config — throttle", () => {
  it("throttle.key is a CEL string literal, not an event-data ref (AGENTS.md rule 15)", () => {
    expect(WHO_DON_FN_CONFIG.throttle.key).toMatch(CEL_STRING_LITERAL);
  });

  it("throttle.key unquotes to 'who.int'", () => {
    expect(WHO_DON_FN_CONFIG.throttle.key).toBe('"who.int"');
  });

  it("throttle.scope is 'account' (coordinates across all function instances)", () => {
    expect(WHO_DON_FN_CONFIG.throttle.scope).toBe("account");
  });

  it("throttle.limit is a positive integer", () => {
    expect(WHO_DON_FN_CONFIG.throttle.limit).toBeGreaterThan(0);
  });

  it("throttle.period is set", () => {
    expect(WHO_DON_FN_CONFIG.throttle.period).toBeTruthy();
  });
});

describe("ingestWHODON function config — concurrency and events", () => {
  it("concurrency.limit is 1 (single cron loop, prevents overlapping runs)", () => {
    expect(WHO_DON_FN_CONFIG.concurrency.limit).toBe(1);
  });

  it("WHO_DON_POLL_EVENT matches the Inngest event name used in manual triggers", () => {
    expect(WHO_DON_POLL_EVENT).toBe("ingest/who-don.poll");
  });

  it("function id is ingest-who-don", () => {
    expect(WHO_DON_FN_CONFIG.id).toBe("ingest-who-don");
  });
});
