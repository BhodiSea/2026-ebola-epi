import "server-only";

import { request } from "@arcjet/next";
import { createSafeActionClient } from "next-safe-action";

import { ajInternal } from "@/lib/arcjet";
import { createClient } from "@/lib/supabase/server";

const actionClient = createSafeActionClient({
  handleServerError(e: Error) {
    return e.message;
  },
});

export const authedAction = actionClient.use(async ({ next }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return next({ ctx: { user, supabase } });
});

export const internalAction = authedAction.use(async ({ next, ctx }) => {
  const role = ctx.user.app_metadata.role;
  if (role !== "admin" && role !== "staff") {
    throw new Error("FORBIDDEN");
  }
  const req = await request();
  const decision = await ajInternal.protect(req, { requested: 1 });
  if (decision.isDenied()) {
    throw new Error("RATE_LIMITED");
  }
  return next({ ctx });
});
