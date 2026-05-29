import "server-only";
import { createHash } from "node:crypto";

import { buildExtractionParams, computePromptVersionHash } from "@ituri/extract";

import { inngest } from "../client";
import {
  createMessage,
  detectDivergence,
  isAlreadyExtracted,
  persistExtraction,
} from "../lib/persist-extraction";
import { RECONCILE_REQUESTED } from "./pipeline-events-config";
import { EXTRACT_DOCUMENT_FN_CONFIG, EXTRACT_DOCUMENT_TRIGGER } from "./pipeline-fn-config";
import { makePairKey } from "./reconcile-counts";

export const extractDocument = inngest.createFunction(
  EXTRACT_DOCUMENT_FN_CONFIG,
  EXTRACT_DOCUMENT_TRIGGER,
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { documentId, sourceSlug, fullText, publishedAtIso } = event.data as {
      documentId: string;
      fullText: string;
      publishedAtIso: string;
      sha256: string;
      sourceSlug: string;
    };

    const pvHash = computePromptVersionHash();

    // Idempotency: skip if this (document, promptVersion) pair was already extracted.
    const alreadyDone = await step.run("idempotency-check", async () =>
      isAlreadyExtracted(documentId, pvHash),
    );
    if (alreadyDone) {
      return { skipped: true, reason: "already_extracted" };
    }

    // LLM extraction — input visible + editable in Inngest UI, OTel trace propagates.
    const rawMsg = await step.ai.wrap("extract", createMessage, buildExtractionParams(fullText));

    // Parse, verify substrings, persist case_counts. Returns the new extraction_run_id.
    const doc = {
      documentId,
      fullText,
      inputDocSha256Hex: createHash("sha256").update(fullText).digest("hex"),
      publishedAtIso,
      pvHash,
      sourceSlug,
    };
    const extractionRunId = await step.run("persist", async () => persistExtraction(doc, rawMsg));

    // Detect cross-source divergences and emit reconcile events.
    const pairs = await step.run("detect-divergence", async () =>
      detectDivergence(extractionRunId),
    );

    if (pairs.length > 0) {
      await step.sendEvent(
        "emit-reconcile",
        pairs.map((pair) => ({
          name: RECONCILE_REQUESTED,
          data: {
            pairKey: makePairKey(pair.newId, pair.existingId),
            // eslint-disable-next-line unicorn/prefer-math-min-max -- UUID string comparison, not numeric
            rowAId: pair.newId < pair.existingId ? pair.newId : pair.existingId,
            // eslint-disable-next-line unicorn/prefer-math-min-max -- UUID string comparison, not numeric
            rowBId: pair.newId < pair.existingId ? pair.existingId : pair.newId,
            outbreakId: pair.outbreakId,
            metric: pair.metric,
            asOf: pair.asOf,
          },
        })),
      );
    }

    return { extracted: true, extractionRunId, divergedPairs: pairs.length };
  },
);
