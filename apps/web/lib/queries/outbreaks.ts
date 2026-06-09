import "server-only";

import { z } from "zod";

import { selectPrimaryOutbreak } from "./select-primary-outbreak.js";
import { createClient } from "@/lib/supabase/server";

/* --- schema ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/naming-convention */
const OutbreakRow = z.object({
  id: z.uuid(),
  pathogen_icd11: z.string(),
  pathogen_slug: z.string().nullable(),
  country_iso3: z.string(),
  onset_date: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  severity_level: z.string().nullable(),
  created_at: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export interface ListOutbreaksFilter {
  pathogen?: string;
  status?: string;
}

export type Outbreak = ReturnType<typeof toOutbreak>;

export type OutbreakRow = z.infer<typeof OutbreakRow>;

/* --- queries ----------------------------------------------------------------- */

export async function getActiveOutbreak(): Promise<null | Outbreak> {
  const supabase = await createClient();

  // Single query; selectPrimaryOutbreak sorts by severity + COD preference client-side.
  const { data } = await supabase
    .from("outbreaks")
    .select(
      "id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level, created_at",
    )
    .eq("status", "active")
    .order("onset_date", { ascending: false });

  if (data === null) {
    return null;
  }

  const rows = z.array(OutbreakRow).safeParse(data);
  if (!rows.success || rows.data.length === 0) {
    return null;
  }

  return selectPrimaryOutbreak(rows.data.map((r) => toOutbreak(r)));
}

export async function getOutbreakById(id: string): Promise<null | Outbreak> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("outbreaks")
    .select(
      "id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (data === null) {
    return null;
  }

  const parsed = OutbreakRow.safeParse(data);
  return parsed.success ? toOutbreak(parsed.data) : null;
}

export async function getOutbreakBySlug(
  pathogenSlug: string,
  countryIso3: string,
  onsetDate: string,
): Promise<null | Outbreak> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("outbreaks")
    .select(
      "id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level, created_at",
    )
    .eq("pathogen_slug", pathogenSlug)
    .eq("country_iso3", countryIso3)
    .eq("onset_date", onsetDate)
    .maybeSingle();

  if (data === null) {
    return null;
  }

  const parsed = OutbreakRow.safeParse(data);
  return parsed.success ? toOutbreak(parsed.data) : null;
}

export async function listOutbreaks(filter: ListOutbreaksFilter): Promise<Outbreak[]> {
  const supabase = await createClient();

  let query = supabase
    .from("outbreaks")
    .select(
      "id, pathogen_icd11, pathogen_slug, country_iso3, onset_date, name, status, severity_level, created_at",
    )
    .order("onset_date", { ascending: false });

  if (filter.status !== undefined && filter.status !== "") {
    query = query.eq("status", filter.status);
  }
  if (filter.pathogen !== undefined && filter.pathogen !== "") {
    query = query.eq("pathogen_slug", filter.pathogen);
  }

  // biome-ignore lint/nursery/useAwaitThenable: Supabase query builder is a PromiseLike thenable
  const { data } = await query;

  if (data === null) {
    return [];
  }

  const rows = z.array(OutbreakRow).safeParse(data);
  return rows.success ? rows.data.map((r) => toOutbreak(r)) : [];
}

function toOutbreak(row: OutbreakRow) {
  return {
    id: row.id,
    pathogenIcd11: row.pathogen_icd11,
    pathogenSlug: row.pathogen_slug,
    countryIso3: row.country_iso3,
    onsetDate: row.onset_date,
    name: row.name,
    status: row.status,
    severityLevel: row.severity_level,
    createdAt: row.created_at,
  };
}

/* eslint-disable @typescript-eslint/naming-convention */
const PathogenRow = z.object({
  pathogen_slug: z.string().nullable(),
  pathogen_icd11: z.string(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export interface Pathogen {
  pathogenIcd11: string;
  pathogenSlug: null | string;
}

/** Distinct pathogens present in the outbreaks table, ordered by slug. */
export async function listPathogens(): Promise<Pathogen[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("outbreaks")
    .select("pathogen_slug, pathogen_icd11")
    .order("pathogen_slug");

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, sonarjs/different-types-comparison -- Supabase response types include null/error branches
  if (error !== null || data === null) {
    return [];
  }

  const rows = z.array(PathogenRow).safeParse(data);
  if (!rows.success) {
    return [];
  }

  // Deduplicate by slug (distinct via Set on JSON key).
  const seen = new Set<string>();
  const result: Pathogen[] = [];
  for (const r of rows.data) {
    const key = r.pathogen_slug ?? r.pathogen_icd11;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ pathogenSlug: r.pathogen_slug, pathogenIcd11: r.pathogen_icd11 });
    }
  }
  return result;
}
