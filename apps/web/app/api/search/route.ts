import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().min(2).max(100),
});

/* eslint-disable @typescript-eslint/naming-convention */
const OutbreakRow = z.object({
  country_iso3: z.string(),
  id: z.string(),
  name: z.string().nullable(),
  onset_date: z.string(),
  pathogen_slug: z.string().nullable(),
});
const SourceRow = z.object({ id: z.string(), name: z.string(), slug: z.string() });
const ZoneRow = z.object({ code: z.string(), name: z.string().nullable() });
const DocRow = z.object({ id: z.string(), title: z.string().nullable() });
/* eslint-enable @typescript-eslint/naming-convention */

export interface SearchResponse {
  groups: { heading: string; items: SearchResult[] }[];
}

export interface SearchResult {
  group: string;
  href: string;
  id: string;
  label: string;
}

interface GroupSpec<T> {
  data: unknown;
  heading: string;
  mapper: (row: T) => SearchResult;
  schema: z.ZodType<T>;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return Response.json({ error: "q must be between 2 and 100 characters" }, { status: 400 });
  }

  const { q } = parsed.data;
  const pattern = `%${q}%`;
  const supabase = await createClient();

  const [outbreaksRes, sourcesRes, zonesRes, docsRes] = await Promise.all([
    supabase
      .from("outbreaks")
      .select("id, name, pathogen_slug, country_iso3, onset_date")
      .or(`name.ilike.${pattern},pathogen_slug.ilike.${pattern},country_iso3.ilike.${pattern}`)
      .eq("status", "active")
      .limit(5),
    supabase
      .from("sources")
      .select("id, name, slug")
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(5),
    supabase.from("zone_codes").select("code, name").ilike("name", pattern).limit(5),
    supabase.from("documents").select("id, title").ilike("title", pattern).limit(5),
  ]);

  const groups: SearchResponse["groups"] = [];

  pushGroup(groups, {
    data: outbreaksRes.data,
    heading: "Outbreaks",
    mapper: (o) => ({
      group: "outbreaks",
      href: `/outbreaks/${o.pathogen_slug ?? "unknown"}/${o.country_iso3.toLowerCase()}/${o.onset_date}`,
      id: o.id,
      label: o.name ?? `${o.pathogen_slug ?? o.country_iso3} — ${o.country_iso3}`,
    }),
    schema: OutbreakRow,
  });

  pushGroup(groups, {
    data: sourcesRes.data,
    heading: "Sources",
    mapper: (s) => ({ group: "sources", href: `/sources#${s.slug}`, id: s.id, label: s.name }),
    schema: SourceRow,
  });

  pushGroup(groups, {
    data: zonesRes.data,
    heading: "Zones",
    mapper: (zone) => ({
      group: "zones",
      href: `/zone/${zone.code}`,
      id: zone.code,
      label: zone.name ?? zone.code,
    }),
    schema: ZoneRow,
  });

  pushGroup(groups, {
    data: docsRes.data,
    heading: "Documents",
    mapper: (d) => ({
      group: "documents",
      href: `/document/${d.id}`,
      id: d.id,
      label: d.title ?? d.id,
    }),
    schema: DocRow,
  });

  return Response.json({ groups } satisfies SearchResponse, {
    headers: { "Cache-Control": "public, max-age=10, s-maxage=60" },
  });
}

function pushGroup<T>(into: SearchResponse["groups"], spec: GroupSpec<T>): void {
  const parsed = z.array(spec.schema).safeParse(spec.data ?? []);
  if (parsed.success && parsed.data.length > 0) {
    into.push({ heading: spec.heading, items: parsed.data.map((row) => spec.mapper(row)) });
  }
}
