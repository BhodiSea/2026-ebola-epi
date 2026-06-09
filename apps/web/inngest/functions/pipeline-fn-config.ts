// Non-server-only: importable by config unit tests without pulling in Drizzle/server-only.
// Function configs for the Phase 6 event-driven pipeline functions.

import {
  DOCUMENT_EXTRACTION_REQUESTED,
  DOCUMENT_TRIAGE_REQUESTED,
  ESCALATION_NOVEL_PATHOGEN_COUNTRY,
  RECONCILE_REQUESTED,
} from "./pipeline-events-config";

export const TRIAGE_DOCUMENT_FN_CONFIG = {
  id: "triage-document",
  retries: 3,
  concurrency: { limit: 5 },
  // Deduplicates concurrent triage runs for the same document within Inngest's
  // dedup window, preventing double Haiku/Sonnet billing on re-trigger.
  idempotency: "event.data.documentId",
} as const;

export const TRIAGE_DOCUMENT_TRIGGER = { event: DOCUMENT_TRIAGE_REQUESTED } as const;

export const EXTRACT_DOCUMENT_FN_CONFIG = {
  id: "extract-document",
  retries: 4,
  concurrency: { limit: 3 },
} as const;

export const EXTRACT_DOCUMENT_TRIGGER = { event: DOCUMENT_EXTRACTION_REQUESTED } as const;

export const RECONCILE_COUNTS_FN_CONFIG = {
  id: "reconcile-counts",
  retries: 3,
  // idempotency key: collapses duplicate reconcile.requested events for the same pair
  // within Inngest's dedup window, preventing double-spend of Opus calls.
  idempotency: "event.data.pairKey",
  concurrency: { limit: 1, key: "event.data.pairKey" },
} as const;

export const RECONCILE_COUNTS_TRIGGER = { event: RECONCILE_REQUESTED } as const;

// Each matchKey (pathogen-country pair) gets one dedicated slot; global cap is capped at
// the plan limit (100) — cheap wait steps, not compute-intensive work.
// Moves waitForEvent out of triage-document (which has limit=5) to prevent starvation
// when ≥5 novel-pair escalations are open simultaneously.
export const AWAIT_ESCALATION_FN_CONFIG = {
  id: "await-escalation" as const,
  retries: 0 as const,
  concurrency: [{ limit: 1, key: "event.data.matchKey" }, { limit: 100 }] as [
    { key: string; limit: number },
    { limit: number },
  ],
};

export const AWAIT_ESCALATION_TRIGGER = { event: ESCALATION_NOVEL_PATHOGEN_COUNTRY } as const;
