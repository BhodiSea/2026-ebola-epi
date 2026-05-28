import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* ─── schema ────────────────────────────────────────────────────────────────── */

const LICENSE_TIERS = ["open", "noncommercial_verified", "display_only", "excluded"] as const;

/* eslint-disable @typescript-eslint/naming-convention */
const DocStatRow = z.object({
  source_id: z.string(),
  ingested_at: z.string().nullable(),
});

const SourceRow = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  url: z.string(),
  trust_score: z.string(),
  license_tier: z.enum(LICENSE_TIERS),
  license_url: z.string().nullable(),
  attribution_required: z.boolean(),
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  last_fetch: z.string().nullable(),
  doc_count: z.number().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type Source = ReturnType<typeof toSource>;

export type SourceRow = z.infer<typeof SourceRow>;

interface SourceStats {
  docCount: number;
  lastFetch: null | string;
}

export async function getSourceBySlug(slug: string): Promise<null | Source> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sources")
    .select(
      "id, slug, name, url, trust_score, license_tier, license_url, attribution_required, metadata, created_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (data === null) {
    return null;
  }

  const { data: docStats, count: docCount } = await supabase
    .from("documents")
    .select("ingested_at", { count: "exact" })
    .eq("source_id", (data as Record<string, unknown>).id)
    .order("ingested_at", { ascending: false })
    .limit(1);

  /* eslint-disable @typescript-eslint/naming-convention */
  const latestFetch = z.array(DocStatRow.pick({ ingested_at: true })).safeParse(docStats).data?.[0];

  const enriched = {
    ...data,
    last_fetch: latestFetch?.ingested_at ?? null,
    doc_count: docCount ?? 0,
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  const parsed = SourceRow.safeParse(enriched);
  return parsed.success ? toSource(parsed.data) : null;
}

/* ─── queries ───────────────────────────────────────────────────────────────── */

export async function listSources(): Promise<Source[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sources")
    .select(
      "id, slug, name, url, trust_score, license_tier, license_url, attribution_required, metadata, created_at",
    )
    .order("name", { ascending: true });

  if (data === null) {
    return [];
  }

  const { data: rawDocStats } = await supabase
    .from("documents")
    .select("source_id, ingested_at")
    .order("ingested_at", { ascending: false });

  const docStatRows = z.array(DocStatRow).safeParse(rawDocStats ?? []);
  const docStats = docStatRows.success ? docStatRows.data : [];

  const statsBySource = new Map<string, SourceStats>();
  for (const doc of docStats) {
    const existing = statsBySource.get(doc.source_id);
    if (existing === undefined) {
      statsBySource.set(doc.source_id, { lastFetch: doc.ingested_at, docCount: 1 });
    } else {
      existing.docCount++;
    }
  }

  /* eslint-disable @typescript-eslint/naming-convention */
  const enriched = (data as Record<string, unknown>[]).map((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    const stats = statsBySource.get(id);
    return { ...row, last_fetch: stats?.lastFetch ?? null, doc_count: stats?.docCount ?? null };
  });
  /* eslint-enable @typescript-eslint/naming-convention */

  const rows = z.array(SourceRow).safeParse(enriched);
  return rows.success ? rows.data.map((s) => toSource(s)) : [];
}

function toSource(row: SourceRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    url: row.url,
    trustScore: Number(row.trust_score),
    licenseTier: row.license_tier,
    licenseUrl: row.license_url,
    attributionRequired: row.attribution_required,
    metadata: row.metadata,
    createdAt: row.created_at,
    lastFetch: row.last_fetch,
    docCount: row.doc_count ?? 0,
  };
}
