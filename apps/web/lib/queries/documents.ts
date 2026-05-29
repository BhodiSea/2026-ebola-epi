import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* ─── schema ────────────────────────────────────────────────────────────────── */

/* eslint-disable @typescript-eslint/naming-convention */
const DocumentRow = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  url: z.string(),
  published_at: z.string().nullable(),
  ingested_at: z.string(),
  source: z.object({
    id: z.uuid(),
    slug: z.string(),
    name: z.string(),
    trust_score: z.string(),
    license_tier: z.string(),
  }),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type Document = ReturnType<typeof toDocument>;

export type DocumentRow = z.infer<typeof DocumentRow>;

function toDocument(row: DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at,
    ingestedAt: row.ingested_at,
    source: {
      id: row.source.id,
      slug: row.source.slug,
      name: row.source.name,
      trustScore: row.source.trust_score,
      licenseTier: row.source.license_tier,
    },
  };
}

const SELECT_COLS =
  "id, title, url, published_at, ingested_at, source:sources(id, slug, name, trust_score, license_tier)";

/* ─── queries ───────────────────────────────────────────────────────────────── */

export interface ListSitrepsFilter {
  page?: number;
  source?: string;
}

export async function listRecentDocuments(limit: number): Promise<Document[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select(SELECT_COLS)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (data === null) {
    return [];
  }

  const rows = z.array(DocumentRow).safeParse(data);
  return rows.success ? rows.data.map((d) => toDocument(d)) : [];
}

const PAGE_SIZE = 25;

export async function getDocumentsForOutbreak(outbreakId: string): Promise<Document[]> {
  const supabase = await createClient();

  const { data: ccData } = await supabase
    .from("case_counts")
    .select("source_quote:source_quotes(document_id)")
    .eq("outbreak_id", outbreakId)
    .eq("status", "published")
    .is("superseded_by", null)
    .limit(100);

  if (ccData === null || ccData.length === 0) {
    return [];
  }

  const docIds = extractDocumentIds(ccData);

  if (docIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from("documents")
    .select(SELECT_COLS)
    .in("id", docIds)
    .order("published_at", { ascending: false });

  if (data === null) {
    return [];
  }

  const rows = z.array(DocumentRow).safeParse(data);
  return rows.success ? rows.data.map((d) => toDocument(d)) : [];
}

export async function getDocumentsForZone(
  outbreakId: string,
  admin2Code: string,
): Promise<Document[]> {
  const supabase = await createClient();

  const { data: ccData } = await supabase
    .from("case_counts")
    .select("source_quote:source_quotes(document_id)")
    .eq("outbreak_id", outbreakId)
    .eq("admin2_code", admin2Code)
    .eq("status", "published")
    .is("superseded_by", null)
    .limit(100);

  if (ccData === null || ccData.length === 0) {
    return [];
  }

  const docIds = extractDocumentIds(ccData);
  if (docIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from("documents")
    .select(SELECT_COLS)
    .in("id", docIds)
    .order("published_at", { ascending: false });

  if (data === null) {
    return [];
  }

  const rows = z.array(DocumentRow).safeParse(data);
  return rows.success ? rows.data.map((d) => toDocument(d)) : [];
}

export async function listSitreps(filter: ListSitrepsFilter): Promise<Document[]> {
  const supabase = await createClient();
  const page = filter.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const sourceFilter = filter.source !== undefined && filter.source !== "" ? filter.source : null;

  // Use !inner when filtering by source so non-matching documents are excluded,
  // not just returned with a null source sub-object.
  const selectCols =
    sourceFilter === null
      ? SELECT_COLS
      : "id, title, url, published_at, ingested_at, source:sources!inner(id, slug, name, trust_score, license_tier)";

  const base = supabase
    .from("documents")
    .select(selectCols)
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // biome-ignore lint/nursery/useAwaitThenable: Supabase query builder is a PromiseLike thenable
  const { data } = await (sourceFilter === null ? base : base.eq("source.slug", sourceFilter));

  if (data === null) {
    return [];
  }

  const rows = z.array(DocumentRow).safeParse(data);
  return rows.success ? rows.data.map((d) => toDocument(d)) : [];
}

function extractDocumentIds(rows: unknown[]): string[] {
  return [
    ...new Set(
      rows.flatMap((r) => {
        if (r === null || typeof r !== "object" || !("source_quote" in r)) {
          return [];
        }
        const id = getDocumentId((r as Record<string, unknown>).source_quote);
        return id === undefined ? [] : [id];
      }),
    ),
  ];
}

function getDocumentId(sq: unknown): string | undefined {
  const candidate: unknown = Array.isArray(sq) ? (sq as unknown[])[0] : sq;
  if (candidate === null || typeof candidate !== "object" || !("document_id" in candidate)) {
    return undefined;
  }
  const docId = (candidate as Record<string, unknown>).document_id;
  return typeof docId === "string" ? docId : undefined;
}
