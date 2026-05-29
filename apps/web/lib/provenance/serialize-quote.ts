import "server-only";

import type { SerializedQuote } from "@/components/provenance/types";
import { SOURCE_ATTR_PATTERN } from "@/lib/copy";
import type { SourceQuoteRow } from "@/lib/queries/source-quotes";

/** Resolve a DB source-quote row into the client-safe SerializedQuote + attribution string.
 *  Mirrors the inline logic in components/provenance/figure.tsx so route handlers can ship
 *  provenance to Client Components without rendering the async <Figure> server component. */
export function serializeQuote(row: SourceQuoteRow): {
  description: string;
  quote: SerializedQuote;
} {
  const quote: SerializedQuote = {
    id: row.id,
    quoteText: row.quote_text,
    charStart: row.char_start,
    charEnd: row.char_end,
    sourceName: row.document.source.name,
    sourceSlug: row.document.source.slug,
    documentUrl: row.document.url,
    publishedAt: row.document.published_at,
    licenseTier: row.document.source.license_tier,
    createdAt: row.created_at,
  };

  const date =
    quote.publishedAt === null
      ? "n.d."
      : new Date(quote.publishedAt).toLocaleDateString("en", { month: "short", year: "numeric" });
  const description = SOURCE_ATTR_PATTERN.replace("{authority}", quote.sourceName).replace(
    "{date}",
    date,
  );

  return { quote, description };
}
