import "server-only";

import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";
import { z } from "zod";

import { inngest } from "../client";
import { buildBatchRequests, persistBatchResults } from "../lib/back-fill";
import { evaluateCapacity } from "../lib/capacity-guard";
import { anthropic } from "../lib/persist-extraction";
import { BACK_FILL_FN_CONFIG, BACK_FILL_TRIGGER } from "./back-fill-config";
import { getExtractionCapacity } from "@/lib/kill-switch";

const MAX_POLLS = 50;
const backfillPayloadSchema = z.object({ documentIds: z.array(z.string()) });
const batchResultTypeSchema = z.enum(["canceled", "errored", "expired", "succeeded"]);

export const backFillExtraction = inngest.createFunction(
  BACK_FILL_FN_CONFIG,
  BACK_FILL_TRIGGER,
  // eslint-disable-next-line max-statements -- Inngest batch handler; polling loop is sequential, not cyclomatic
  async ({ event, step }) => {
    const { documentIds } = backfillPayloadSchema.parse(event.data);

    // Back-fill is lowest-priority — re-evaluate on every attempt; not memoized.
    const capacity = await getExtractionCapacity();
    const guard = evaluateCapacity(capacity, "low");
    if (!guard.proceed) {
      return { skipped: true, reason: guard.skipReason };
    }

    const requests = await step.run("build-requests", async () => buildBatchRequests(documentIds));

    if (requests.length === 0) {
      return { skipped: true, reason: "no_documents_found" };
    }

    const batch = await step.run("create-batch", async () =>
      anthropic.messages.batches.create({ requests }),
    );

    const batchId = batch.id;
    let status = batch.processing_status;
    let pollCount = 0;

    while (status !== "ended" && pollCount < MAX_POLLS) {
      // eslint-disable-next-line no-await-in-loop
      await step.sleep(`poll-delay-${pollCount}`, "5m");
      // eslint-disable-next-line no-await-in-loop
      const polled = await step.run(`poll-status-${pollCount}`, async () =>
        anthropic.messages.batches.retrieve(batchId),
      );
      status = polled.processing_status;
      pollCount += 1;
    }

    const results = await step.run("collect-results", async () => {
      const items: MessageBatchIndividualResponse[] = [];
      const decoder = await anthropic.messages.batches.results(batchId);
      for await (const item of decoder) {
        items.push(item);
      }
      return items;
    });

    const mapped = results.map((item) => ({
      // eslint-disable-next-line @typescript-eslint/naming-convention -- Anthropic Batch API field name
      custom_id: item.custom_id,
      result: {
        type: batchResultTypeSchema.parse(item.result.type),
        message: item.result.type === "succeeded" ? item.result.message : undefined,
      },
    }));

    await step.run("persist-results", async () => persistBatchResults(batchId, mapped));

    return { batchId, processed: results.length };
  },
);
