import "server-only";

import { NextResponse } from "next/server";

import { isInternalUser } from "@/lib/auth/internal-user";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SAFE_EVENT_ID = /^[\w-]+$/;

export async function GET(_req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isInternalUser(user)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { eventId } = await ctx.params;

  if (!(eventId && SAFE_EVENT_ID.test(eventId))) {
    return NextResponse.json({ error: "BAD_ID" }, { status: 400 });
  }

  const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
    headers: { Authorization: `Bearer ${env.INNGEST_API_KEY ?? ""}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Inngest ${res.status}` }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
  const body = (await res.json()) as unknown as { data?: unknown[] };
  return NextResponse.json({ runs: body.data ?? [] });
}
