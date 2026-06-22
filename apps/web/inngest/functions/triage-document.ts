import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { agentActions, incidents, outbreaks } from "@ituri/db";
import {
  buildTriageParams,
  computeTriagePromptHash,
  MODEL_HAIKU,
  MODEL_SONNET,
  parseTriageResponse,
} from "@ituri/extract";
import { and, eq } from "drizzle-orm";

import { inngest } from "../client";
import { evaluateCapacity } from "../lib/capacity-guard";
import { logAnthropicUsage } from "../lib/usage-log";
import {
  DOCUMENT_EXTRACTION_REQUESTED,
  ESCALATION_NOVEL_PATHOGEN_COUNTRY,
} from "./pipeline-events-config";
import { TRIAGE_DOCUMENT_FN_CONFIG, TRIAGE_DOCUMENT_TRIGGER } from "./pipeline-fn-config";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getExtractionCapacity } from "@/lib/kill-switch";
import { notifyKillSwitch, notifySlack } from "@/lib/notify";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function recordNotOutbreakSkip(documentId: string, sourceSlug: string): Promise<void> {
  await db.insert(agentActions).values({
    agent: "triage-document",
    action: "skipped_not_outbreak",
    payload: { documentId, sourceSlug },
  });
}

async function createHaikuMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

async function createSonnetMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  return anthropic.messages.create(params);
}

async function isNovelPair(pathogenIcd11: string, countryIso3: string): Promise<boolean> {
  const rows = await db
    .select({ id: outbreaks.id })
    .from(outbreaks)
    .where(and(eq(outbreaks.pathogenIcd11, pathogenIcd11), eq(outbreaks.countryIso3, countryIso3)))
    .limit(1);
  return rows.length === 0;
}

export const triageDocument = inngest.createFunction(
  TRIAGE_DOCUMENT_FN_CONFIG,
  TRIAGE_DOCUMENT_TRIGGER,
  // eslint-disable-next-line max-statements, max-lines-per-function -- Inngest orchestration: step.run/ai.wrap calls are inherently sequential; count reflects coordination, not complexity.
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { documentId, sourceSlug, fullText, sha256, publishedAtIso } = event.data as {
      documentId: string;
      fullText: string;
      publishedAtIso: string;
      sha256: string;
      sourceSlug: string;
    };

    // Kill-switch: check cost capacity before burning Haiku/Sonnet tokens.
    const capacity = await step.run("check-capacity", async () => getExtractionCapacity());
    const guard = evaluateCapacity(capacity, "high");
    if (!guard.proceed) {
      if (capacity === "paused") {
        await step.run("alert-paused", async () => notifyKillSwitch(documentId));
      }
      return { skipped: true, reason: guard.skipReason };
    }

    const triageHash = computeTriagePromptHash();

    // First pass: Haiku (cheap, fast)
    let rawMsg = await step.ai.wrap(
      "triage-haiku",
      createHaikuMessage,
      buildTriageParams(fullText, MODEL_HAIKU),
    );

    const haiku = await step.run("parse-triage", () => parseTriageResponse(rawMsg));
    await step.run("log-triage-haiku", async () =>
      logAnthropicUsage({
        modelId: MODEL_HAIKU,
        inputTokens: haiku.usage.input_tokens,
        outputTokens: haiku.usage.output_tokens,
        cacheReadInputTokens: haiku.usage.cache_read_input_tokens ?? null,
        cacheCreationInputTokens: haiku.usage.cache_creation_input_tokens ?? null,
      }),
    );

    let { triage } = haiku;

    // Low-confidence second pass: Sonnet
    if (triage.confidence < 0.7) {
      rawMsg = await step.ai.wrap(
        "triage-sonnet",
        createSonnetMessage,
        buildTriageParams(fullText, MODEL_SONNET),
      );
      const sonnet = await step.run("parse-triage-2", () => parseTriageResponse(rawMsg));
      await step.run("log-triage-sonnet", async () =>
        logAnthropicUsage({
          modelId: MODEL_SONNET,
          inputTokens: sonnet.usage.input_tokens,
          outputTokens: sonnet.usage.output_tokens,
          cacheReadInputTokens: sonnet.usage.cache_read_input_tokens ?? null,
          cacheCreationInputTokens: sonnet.usage.cache_creation_input_tokens ?? null,
        }),
      );
      triage = sonnet.triage;
    }

    if (!triage.is_outbreak) {
      await step.run("record-not-outbreak-skip", async () =>
        recordNotOutbreakSkip(documentId, sourceSlug),
      );
      return { skipped: true, reason: "not_outbreak" };
    }

    // Novel pair check: (pathogen, country) not yet in outbreaks table
    if (triage.novelty === "new" && triage.confidence >= 0.7) {
      const novel = await step.run("is-novel-pair", async () =>
        isNovelPair(triage.pathogen_icd11, triage.country_iso3),
      );
      if (novel) {
        const matchKey = `${triage.pathogen_icd11}-${triage.country_iso3}`;
        await step.sendEvent("emit-novel", {
          name: ESCALATION_NOVEL_PATHOGEN_COUNTRY,
          data: {
            matchKey,
            pathogenIcd11: triage.pathogen_icd11,
            countryIso3: triage.country_iso3,
            documentId,
            sourceSlug,
            fullText,
            sha256,
            publishedAtIso,
            triageHash,
          },
        });
        // Class 1: write incident row and alert Slack before waiting on human confirmation.
        await step.run("write-novel-incident", async () =>
          Promise.all([
            db.insert(incidents).values({
              class: "novel_pathogen_country",
              documentId,
              detail: {
                pathogenIcd11: triage.pathogen_icd11,
                countryIso3: triage.country_iso3,
                matchKey,
              },
            }),
            notifySlack(
              `Novel pathogen/country pair: ${triage.pathogen_icd11} in ${triage.country_iso3}. Document ${documentId} held pending editorial confirmation (7-day window).`,
            ),
          ]),
        );
        // await-escalation.ts holds the 7-day waitForEvent in its own concurrency slot,
        // freeing this function's limit=5 slots for new documents.
        return { triaged: true, escalated: true };
      }
    }

    await step.sendEvent("emit-extract", {
      name: DOCUMENT_EXTRACTION_REQUESTED,
      data: { documentId, sourceSlug, fullText, sha256, publishedAtIso, triageHash },
    });

    return { triaged: true, isOutbreak: triage.is_outbreak };
  },
);
