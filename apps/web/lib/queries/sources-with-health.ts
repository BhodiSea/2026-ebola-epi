import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const SourceWithHealthRow = z.object({
  extraction_paused: z.boolean(),
  failure_count_7d: z.number().nullable(),
  id: z.string(),
  last_fetched_at: z.string().nullable(),
  license_tier: z.string(),
  name: z.string().nullable(),
  parser_version: z.string().nullable(),
  slug: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type SourceWithHealth = ReturnType<typeof toSourceWithHealth>;

type SourceWithHealthRow = z.infer<typeof SourceWithHealthRow>;

export async function listSourcesWithHealth(): Promise<SourceWithHealth[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sources_with_health")
    .select(
      "id, slug, name, last_fetched_at, parser_version, extraction_paused, license_tier, failure_count_7d",
    )
    .order("slug");

  if (error !== null) {
    return [];
  }

  const parsed = z.array(SourceWithHealthRow).safeParse(data);
  return parsed.success ? parsed.data.map((r) => toSourceWithHealth(r)) : [];
}

function toSourceWithHealth(row: SourceWithHealthRow) {
  return {
    extractionPaused: row.extraction_paused,
    failureCount7d: row.failure_count_7d ?? 0,
    id: row.id,
    lastFetchedAt: row.last_fetched_at,
    licenseTier: row.license_tier,
    name: row.name,
    parserVersion: row.parser_version,
    slug: row.slug,
  };
}
