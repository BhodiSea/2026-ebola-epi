import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/naming-convention */
const SourceQuoteSlim = z.object({
  char_end: z.number().int().nonnegative(),
  char_start: z.number().int().nonnegative(),
  id: z.uuid(),
  quote_text: z.string(),
});

const CaseCountSlim = z.object({
  as_of: z.string().nullable(),
  id: z.uuid(),
  metric: z.string(),
  source_quote_id: z.uuid(),
  value: z.number().int().nonnegative().nullable(),
});
/* eslint-enable @typescript-eslint/naming-convention */

export interface DocumentFigure {
  asOf: null | string;
  id: string;
  metric: string;
  quote: {
    charEnd: number;
    charStart: number;
    text: string;
  };
  sourceQuoteId: string;
  value: null | number;
}

export async function getFiguresForDocument(documentId: string): Promise<DocumentFigure[]> {
  const supabase = await createClient();

  const { data: sqRaw } = await supabase
    .from("source_quotes")
    .select("id, quote_text, char_start, char_end")
    .eq("document_id", documentId)
    .limit(100);

  const sqParsed = z.array(SourceQuoteSlim).safeParse(sqRaw ?? []);
  if (!sqParsed.success || sqParsed.data.length === 0) {
    return [];
  }

  const quoteIds = sqParsed.data.map((sq) => sq.id);

  const { data: ccRaw } = await supabase
    .from("case_counts")
    .select("id, value, as_of, metric, source_quote_id")
    .in("source_quote_id", quoteIds)
    .eq("status", "published")
    .is("superseded_by", null)
    .limit(50);

  const ccParsed = z.array(CaseCountSlim).safeParse(ccRaw ?? []);
  if (!ccParsed.success) {
    return [];
  }

  const sqMap = new Map(sqParsed.data.map((sq) => [sq.id, sq]));

  return ccParsed.data.flatMap((cc) => {
    const sq = sqMap.get(cc.source_quote_id);
    if (sq === undefined) {
      return [];
    }
    return [
      {
        asOf: cc.as_of,
        id: cc.id,
        metric: cc.metric,
        quote: {
          charEnd: sq.char_end,
          charStart: sq.char_start,
          text: sq.quote_text,
        },
        sourceQuoteId: cc.source_quote_id,
        value: cc.value,
      },
    ];
  });
}
