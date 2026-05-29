import { z } from "zod";

import { TILE_VERSION } from "@/lib/map/tile-version";
import { createClient } from "@/lib/supabase/server";

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

  const sb = await createClient();
  /* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment -- custom RPC is untyped; outbreak_id is a SQL arg name */
  const { data, error } = await sb.rpc("mvt", {
    z: parsed.data.z,
    x: parsed.data.x,
    y: parsed.data.y,
    ...(parsed.data.outbreakId === undefined ? {} : { outbreak_id: parsed.data.outbreakId }),
  });
  /* eslint-enable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment */

  if (error !== null) {
    return new Response("tile generation failed", { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- internal.mvt returns bytea; Supabase types it as `any`
  return new Response(data as ArrayBuffer, {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
