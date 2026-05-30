"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { internalAction } from "@/lib/actions/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const ackIncidentAction = internalAction
  .inputSchema(z.object({ incidentId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const admin = createAdminClient();
    const { error } = await admin
      .from("incidents")
      /* eslint-disable @typescript-eslint/naming-convention */
      .update({
        ack_at: new Date().toISOString(),
        ack_by: ctx.user.email,
        status: "acked",
      })
      /* eslint-enable @typescript-eslint/naming-convention */
      .eq("id", parsedInput.incidentId);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/internal/escalations");
  });
