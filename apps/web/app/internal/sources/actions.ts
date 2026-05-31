"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
