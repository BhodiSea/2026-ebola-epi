"use server";

import "server-only";

import { REGISTERED_SOURCE_SLUGS } from "@ituri/ingest";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { pollEventName } from "@/inngest/functions/ingest-source-config";
import { internalAction } from "@/lib/actions/client";

export const toggleSourcePauseAction = internalAction
  .inputSchema(z.object({ paused: z.boolean(), sourceId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const { error } = await ctx.supabase
      .from("sources")
      /* eslint-disable @typescript-eslint/naming-convention */
      .update({ extraction_paused: parsedInput.paused })
      /* eslint-enable @typescript-eslint/naming-convention */
      .eq("id", parsedInput.sourceId);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/internal/sources");
  });

export const triggerIngestPollAction = internalAction
  .inputSchema(z.object({ slug: z.enum(REGISTERED_SOURCE_SLUGS) }))
  .action(async ({ parsedInput }) => {
    const result = await inngest.send({
      name: pollEventName(parsedInput.slug),
      data: { triggeredBy: "internal-ui" },
    });
    return { eventId: result.ids[0] };
  });
