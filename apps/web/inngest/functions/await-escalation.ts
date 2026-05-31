import "server-only";

import { agentActions } from "@ituri/db";

import { inngest } from "../client";
import { DOCUMENT_EXTRACTION_REQUESTED, ESCALATION_CONFIRMED } from "./pipeline-events-config";
import { AWAIT_ESCALATION_FN_CONFIG, AWAIT_ESCALATION_TRIGGER } from "./pipeline-fn-config";
import { db } from "@/lib/db";

export const awaitEscalation = inngest.createFunction(
  AWAIT_ESCALATION_FN_CONFIG,
  AWAIT_ESCALATION_TRIGGER,
  async ({ event, step }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const data = event.data as {
      documentId: string;
      fullText: string;
      matchKey: string;
      publishedAtIso: string;
      sha256: string;
      sourceSlug: string;
      triageHash: string;
    };
    const { matchKey, documentId, sourceSlug, fullText, sha256, publishedAtIso, triageHash } = data;

    const confirmed = await step.waitForEvent("wait-confirm", {
      event: ESCALATION_CONFIRMED,
      match: "data.matchKey",
      timeout: "7d",
    });

    if (!confirmed) {
      await step.run("log-timeout", async () =>
        db.insert(agentActions).values({
          agent: "await-escalation",
          action: "escalation_timeout",
          subjectTable: "documents",
          subjectId: documentId,
          payload: { matchKey },
        }),
      );
      return { skipped: true, reason: "escalation_timeout" };
    }

    await step.sendEvent("emit-extract", {
      name: DOCUMENT_EXTRACTION_REQUESTED,
      data: { documentId, sourceSlug, fullText, sha256, publishedAtIso, triageHash },
    });

    return { confirmed: true, matchKey };
  },
);
