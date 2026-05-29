import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { outbreaks } from "@ituri/db";
import {
  buildTriageParams,
  computeTriagePromptHash,
  MODEL_HAIKU,
  MODEL_SONNET,
  parseTriageResponse,
} from "@ituri/extract";
import { and, eq } from "drizzle-orm";

import { inngest } from "../client";
import {
  DOCUMENT_EXTRACTION_REQUESTED,
  ESCALATION_CONFIRMED,
  ESCALATION_NOVEL_PATHOGEN_COUNTRY,
} from "./pipeline-events-config";
import { TRIAGE_DOCUMENT_FN_CONFIG, TRIAGE_DOCUMENT_TRIGGER } from "./pipeline-fn-config";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

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
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const { documentId, sourceSlug, fullText, sha256, publishedAtIso } = event.data as {
      documentId: string;
      fullText: string;
      publishedAtIso: string;
      sha256: string;
      sourceSlug: string;
    };

    const triageHash = computeTriagePromptHash();

    // First pass: Haiku (cheap, fast)
    let rawMsg = await step.ai.wrap(
      "triage-haiku",
      createHaikuMessage,
      buildTriageParams(fullText, MODEL_HAIKU),
    );

    let { triage } = await step.run("parse-triage", () => parseTriageResponse(rawMsg));

    // Low-confidence second pass: Sonnet
    if (triage.confidence < 0.7) {
      rawMsg = await step.ai.wrap(
        "triage-sonnet",
        createSonnetMessage,
        buildTriageParams(fullText, MODEL_SONNET),
      );
      ({ triage } = await step.run("parse-triage-2", () => parseTriageResponse(rawMsg)));
    }

    if (!triage.is_outbreak) {
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
          },
        });
        // Wait up to 7 days for a human to confirm the novel pair.
        // On timeout (resolved to null), skip extraction for safety.
        // WARNING: with TRIAGE_DOCUMENT_FN_CONFIG.concurrency.limit = 5, up to 5
        // simultaneous escalations will hold all concurrency slots for the full 7d window,
        // starving new documents. If novel-pair escalations become frequent, move the
        // waitForEvent into a dedicated await-escalation Inngest function or raise the limit.
        const confirmed = await step.waitForEvent("wait-confirm", {
          event: ESCALATION_CONFIRMED,
          match: "data.matchKey",
          timeout: "7d",
        });
        if (!confirmed) {
          return { skipped: true, reason: "escalation_timeout" };
        }
      }
    }

    await step.sendEvent("emit-extract", {
      name: DOCUMENT_EXTRACTION_REQUESTED,
      data: { documentId, sourceSlug, fullText, sha256, publishedAtIso, triageHash },
    });

    return { triaged: true, isOutbreak: triage.is_outbreak };
  },
);
