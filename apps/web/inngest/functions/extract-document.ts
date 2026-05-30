import "server-only";
import { createHash } from "node:crypto";

import { agentActions, incidents } from "@ituri/db";
import {
  buildExtractionParams,
  CANDIDATE_PROMPT_VERSION,
  computePromptVersionHash,
} from "@ituri/extract";

import { inngest } from "../client";
import { evaluateCapacity } from "../lib/capacity-guard";
import {
  createMessage,
  detectDivergence,
  isAlreadyExtracted,
  persistExtraction,
} from "../lib/persist-extraction";
import {
  ESCALATION_CREATED,
  RECONCILE_REQUESTED,
  SHADOW_RUN_TRIGGER,
} from "./pipeline-events-config";
import { EXTRACT_DOCUMENT_FN_CONFIG, EXTRACT_DOCUMENT_TRIGGER } from "./pipeline-fn-config";
import { makePairKey } from "./reconcile-counts";
import { db } from "@/lib/db";
import { getExtractionCapacity } from "@/lib/kill-switch";
import { notifyAnomaly, notifyKillSwitch, openGithubIssue } from "@/lib/notify";

export const extractDocument = inngest.createFunction(
  EXTRACT_DOCUMENT_FN_CONFIG,
  EXTRACT_DOCUMENT_TRIGGER,
  // eslint-disable-next-line max-lines-per-function, max-statements -- Inngest handler orchestrates multiple steps; complexity is in coordination, not logic
  async ({ event, step, attempt }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { documentId, sourceSlug, fullText, publishedAtIso } = event.data as {
      documentId: string;
      fullText: string;
      publishedAtIso: string;
      sha256: string;
      sourceSlug: string;
    };

    const pvHash = computePromptVersionHash();

    // Kill-switch: re-evaluate on every attempt so a mid-flight operator change takes effect.
    const capacity = await getExtractionCapacity();
    const guard = evaluateCapacity(capacity, "high");
    if (!guard.proceed) {
      await step.run("log-skipped", async () =>
        db.insert(agentActions).values({
          agent: "extract-document",
          action: "extraction_skipped",
          subjectTable: "documents",
          subjectId: documentId,
          payload: { reason: guard.skipReason },
        }),
      );
      if (capacity === "paused") {
        await step.run("alert-paused", async () => notifyKillSwitch(documentId));
      }
      return { skipped: true, reason: guard.skipReason };
    }

    // Idempotency: skip if this (document, promptVersion) pair was already extracted.
    const alreadyDone = await step.run("idempotency-check", async () =>
      isAlreadyExtracted(documentId, pvHash),
    );
    if (alreadyDone) {
      return { skipped: true, reason: "already_extracted" };
    }

    // LLM extraction — input visible + editable in Inngest UI, OTel trace propagates.
    const rawMsg = await step.ai.wrap("extract", createMessage, buildExtractionParams(fullText));

    const doc = {
      documentId,
      fullText,
      inputDocSha256Hex: createHash("sha256").update(fullText).digest("hex"),
      publishedAtIso,
      pvHash,
      sourceSlug,
    };

    // Class 2: substring_verify_fail twice → open GitHub issue and give up.
    let persistResult: Awaited<ReturnType<typeof persistExtraction>>;
    try {
      persistResult = await step.run("persist", async () => persistExtraction(doc, rawMsg));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.startsWith("substring_verify_fail:") && attempt >= 1) {
        await step.run("github-issue", async () =>
          openGithubIssue({
            title: `substring_verify_fail: ${sourceSlug} (${documentId})`,
            body: msg,
            labels: ["extraction", "verify-fail"],
          }),
        );
        await step.run("write-verify-fail-incident", () =>
          db.insert(incidents).values({
            class: "substring_verify_fail",
            documentId,
            detail: { message: msg, sourceSlug, pvHash },
          }),
        );
        return { skipped: true, reason: "substring_verify_fail" };
      }
      throw error;
    }

    const { extractionRunId, escalations } = persistResult;

    // Class 4: anomaly signals → hold rows, write incidents, notify, emit event.
    if (escalations.length > 0) {
      await step.run("write-anomaly-incidents", async () =>
        Promise.all(
          escalations.map((esc) =>
            db.insert(incidents).values({
              class: "anomaly",
              outbreakId: esc.outbreakId,
              documentId,
              detail: { caseCountId: esc.caseCountId, signals: esc.signals },
            }),
          ),
        ),
      );
      await step.run("notify-anomaly", async () =>
        Promise.all(escalations.map(async (esc) => notifyAnomaly(esc.outbreakId, esc.signals))),
      );
      await step.sendEvent(
        "emit-escalation",
        escalations.map((esc) => ({
          name: ESCALATION_CREATED,
          data: { caseCountId: esc.caseCountId, outbreakId: esc.outbreakId, documentId },
        })),
      );
    }

    // Shadow run: ~10% deterministic sample keyed on documentId (stable across Inngest replays).
    // readUInt8(0) is safe: SHA-256 digest is always 32 bytes, offset 0 is always valid.
    if (createHash("sha256").update(documentId).digest().readUInt8(0) < 26) {
      await step.sendEvent("shadow-sample", {
        name: SHADOW_RUN_TRIGGER,
        data: { documentId, fullText, candidatePromptVersion: CANDIDATE_PROMPT_VERSION },
      });
    }

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
