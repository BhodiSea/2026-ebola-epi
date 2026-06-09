import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* --- schema ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/naming-convention */
const ZoneRow = z.object({
  admin2_code: z.string(),
  name: z.string(),
  svg_path: z.string().nullable(),
  total_value: z.number(),
  bbox_xmin: z.number(),
  bbox_xmax: z.number(),
  bbox_ymin: z.number(),
  bbox_ymax: z.number(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export interface ChoroplethData {
  globalBbox: { xmax: number; xmin: number; ymax: number; ymin: number };
  zones: ZoneData[];
}

export interface ZoneData {
  admin2Code: string;
  bbox: { xmax: number; xmin: number; ymax: number; ymin: number };
  name: string;
  svgPath: null | string;
  totalValue: number;
}

export type ZoneRow = z.infer<typeof ZoneRow>;

/* --- query ------------------------------------------------------------------- */

export async function getOutbreakZoneSvg(outbreakId: string): Promise<ChoroplethData | null> {
  const supabase = await createClient();

  /* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment */
  const { data } = await supabase.rpc("outbreak_zone_svg", {
    p_outbreak_id: outbreakId,
  });
  /* eslint-enable @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment */

  if (data === null) {
    return null;
  }

  const rows = z.array(ZoneRow).safeParse(data);
  if (!rows.success || rows.data.length === 0) {
    return null;
  }

  const zones: ZoneData[] = rows.data.map((r) => ({
    admin2Code: r.admin2_code,
    name: r.name,
    svgPath: r.svg_path,
    totalValue: r.total_value,
    bbox: { xmin: r.bbox_xmin, xmax: r.bbox_xmax, ymin: r.bbox_ymin, ymax: r.bbox_ymax },
  }));

  const globalBbox = {
    xmin: Math.min(...zones.map((zone) => zone.bbox.xmin)),
    xmax: Math.max(...zones.map((zone) => zone.bbox.xmax)),
    ymin: Math.min(...zones.map((zone) => zone.bbox.ymin)),
    ymax: Math.max(...zones.map((zone) => zone.bbox.ymax)),
  };

  return { zones, globalBbox };
}
