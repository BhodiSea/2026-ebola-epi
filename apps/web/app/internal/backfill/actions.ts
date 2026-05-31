"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { DOCUMENT_BACKFILL_REQUESTED } from "@/inngest/functions/pipeline-events-config";
import { internalAction } from "@/lib/actions/client";

export const enqueueBackfillAction = internalAction
  .inputSchema(
    z.object({
      documentIds: z.array(z.uuid()).min(1).max(200),
    }),
  )
  .action(async ({ parsedInput }) => {
    await inngest.send({
      name: DOCUMENT_BACKFILL_REQUESTED,
      data: { documentIds: parsedInput.documentIds },
    });
    revalidatePath("/internal/backfill");
  });
