import "server-only";

import { z } from "zod";

import { createStaticClient } from "@/lib/supabase/server";

/* ─── schema ────────────────────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/naming-convention */
const ZoneCodeRow = z.object({
  code: z.string(),
  name: z.string().nullable(),
  admin1_code: z.string().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type ZoneCode = z.infer<typeof ZoneCodeRow>;

/* ─── queries ───────────────────────────────────────────────────────────────── */

/** All health zones exposed via the public.zone_codes view (geo.admin2 projection). */
export async function listAdmin2Codes(): Promise<ZoneCode[]> {
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from("zone_codes")
    .select("code, name, admin1_code")
    .order("code");

  if (error !== null) {
    return [];
  }

  const rows = z.array(ZoneCodeRow).safeParse(data);
  return rows.success ? rows.data : [];
}
