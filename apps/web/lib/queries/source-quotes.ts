import "server-only";

import { SourceQuoteId } from "@ituri/shared";
import { unstable_cache } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const SourceQuoteRow = z.object({
  id: SourceQuoteId,
  quote_text: z.string(),
  char_start: z.number().int().nonnegative(),
  char_end: z.number().int().nonnegative(),
  created_at: z.string(),
  document: z.object({
    id: z.uuid(),
    url: z.string().nullable(),
    published_at: z.string().nullable(),
    source: z.object({
      name: z.string(),
      slug: z.string(),
      license_tier: z.string(),
    }),
  }),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type SourceQuoteRow = z.infer<typeof SourceQuoteRow>;

/* eslint-disable @typescript-eslint/naming-convention */
const CaseCountSummary = z.object({
  value: z.number().nullable(),
  geo_admin_2: z.string().nullable(),
  observed_at: z.string().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export type CaseCountSummary = z.infer<typeof CaseCountSummary>;

export async function getFiguresUsingQuote(id: SourceQuoteId): Promise<CaseCountSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("case_counts")
    .select("value, geo_admin_2, observed_at")
    .eq("source_quote_id", id)
    .eq("status", "published")
    .is("superseded_by", null)
    .limit(20);

  if (error !== null) {
    return [];
  }

  return z.array(CaseCountSummary).parse(data);
}

export async function getSourceQuoteById(id: SourceQuoteId): Promise<null | SourceQuoteRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_quotes")
    .select(
      `id, quote_text, char_start, char_end, created_at,
       document:documents(id, url, published_at,
         source:sources(name, slug, license_tier))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error !== null || data === null) {
    return null;
  }

  const parsed = SourceQuoteRow.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export const getQuotesForMethodsPage = unstable_cache(
  async (): Promise<SourceQuoteRow[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("source_quotes")
      .select(
        `id, quote_text, char_start, char_end, created_at,
         document:documents(id, url, published_at,
           source:sources(name, slug, license_tier))`,
      )
      .order("created_at", { ascending: false })
      .limit(3);

    if (error !== null) {
      return [];
    }

    const rows = z.array(SourceQuoteRow).safeParse(data);
    return rows.success ? rows.data : [];
  },
  ["methods-quotes-v1"],
  { tags: ["source_quotes"] },
);
