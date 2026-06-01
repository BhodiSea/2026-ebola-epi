import { z } from "zod";

import { env } from "@/lib/env";
import { TILE_VERSION } from "@/lib/map/tile-version";

export const runtime = "nodejs";

// `v` must equal the current TILE_VERSION: tiles are CDN-cached `immutable`, so a stale-version
// URL must NOT silently serve live data under the wrong cache key — reject it. x/y are bounded to
// the valid Web-Mercator range for the parsed zoom so out-of-range tiles can't reach Postgres or
// amplify the CDN cache.
const TileSchema = z
  .object({
    v: z.literal(TILE_VERSION),
    z: z.coerce.number().int().min(0).max(24),
    x: z.coerce.number().int().min(0),
    y: z.coerce.number().int().min(0),
    outbreakId: z.uuid().optional(),
  })
  .refine((t) => t.x < 2 ** t.z && t.y < 2 ** t.z, {
    message: "tile coordinate out of range for zoom",
  });

export async function GET(
  req: Request,
  ctx: { params: Promise<{ v: string; x: string; y: string; z: string }> },
) {
  const params = await ctx.params;
  const outbreakId = new URL(req.url).searchParams.get("outbreak_id") ?? undefined;
  const parsed = TileSchema.safeParse({
    v: params.v,
    z: params.z,
    x: params.x,
    y: params.y,
    outbreakId,
  });
  if (!parsed.success) {
    return new Response("invalid tile request", { status: 400 });
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseUrl === undefined || publishableKey === undefined) {
    return new Response("tile generation failed", { status: 500 });
  }

  /* eslint-disable @typescript-eslint/naming-convention -- SQL arg name uses snake_case */
  const rpcBody = {
    ...(parsed.data.outbreakId === undefined ? {} : { outbreak_id: parsed.data.outbreakId }),
    x: parsed.data.x,
    y: parsed.data.y,
    z: parsed.data.z,
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/mvt`, {
    method: "POST",
    headers: {
      Accept: "application/octet-stream",
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
      apikey: publishableKey,
    },
    body: JSON.stringify(rpcBody),
  });

  if (!res.ok) {
    return new Response("tile generation failed", { status: 500 });
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength === 0) {
    return new Response(null, { status: 204 });
  }

  return new Response(buffer, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      "Content-Type": "application/x-protobuf",
    },
  });
}
