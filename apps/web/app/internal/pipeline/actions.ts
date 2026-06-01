"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { internalAction } from "@/lib/actions/client";
import { env } from "@/lib/env";

export const retryInngestRunAction = internalAction
  .inputSchema(
    z.object({
      runId: z
        .string()
        .regex(/^[\w-]+$/)
        .min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const res = await fetch(`https://api.inngest.com/v1/runs/${parsedInput.runId}/retry`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INNGEST_SIGNING_KEY}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Inngest retry failed: ${res.status}`);
    }
    revalidatePath("/internal/pipeline");
  });
