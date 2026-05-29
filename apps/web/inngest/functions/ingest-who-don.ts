import "server-only";
import { createHash } from "node:crypto";

import { fetchAndParseDocument, pollWHODON } from "@ituri/ingest";

import { inngest } from "../client";
import { resolveSourceId, upsertDocument } from "../lib/persist-extraction";
import { DOCUMENT_TRIAGE_REQUESTED } from "./pipeline-events-config";
import { WHO_DON_FN_CONFIG, WHO_DON_POLL_EVENT } from "./who-don-config";

// ─── Inngest function ─────────────────────────────────────────────────────────
// Phase 6: the per-document LLM work is now event-driven:
//   ingest-who-don → document.triage.requested → triage-document
//                  → document.extraction.requested → extract-document
//                  → reconcile.requested → reconcile-counts

export const ingestWHODON = inngest.createFunction(
  WHO_DON_FN_CONFIG,
  [{ cron: "*/30 * * * *" }, { event: WHO_DON_POLL_EVENT }],
  async ({ step }) => {
    const items = await step.run("poll-rss", async () => pollWHODON());
    const sourceId = await step.run("resolve-source-id", async () => resolveSourceId("who-don"));

    for (const item of items) {
      const stepId = createHash("sha256").update(item.url).digest("hex").slice(0, 16);

      // eslint-disable-next-line no-await-in-loop
      const doc = await step.run(`fetch-${stepId}`, async () => {
        const { sha256, fullText, html } = await fetchAndParseDocument(item.url);
        const documentId = await upsertDocument({
          fullText,
          publishedAt: new Date(item.publishedAt),
          sha256,
          sourceId,
          url: item.url,
        });
        return {
          documentId,
          fullText,
          sha256Hex: sha256.toString("hex"),
          publishedAtIso: item.publishedAt,
          sourceSlug: "who-don",
          // html is only used for the document sha256 dedup; fullText is used for extraction
          htmlLength: html.length,
        };
      });

      // Emit triage event — triage-document handles LLM classification and
      // extraction as separate Inngest functions (step.waitForEvent-safe).
      // eslint-disable-next-line no-await-in-loop
      await step.sendEvent(`emit-${stepId}`, {
        name: DOCUMENT_TRIAGE_REQUESTED,
        data: {
          documentId: doc.documentId,
          sourceSlug: doc.sourceSlug,
          fullText: doc.fullText,
          sha256: doc.sha256Hex,
          publishedAtIso: doc.publishedAtIso,
        },
      });
    }
  },
);
