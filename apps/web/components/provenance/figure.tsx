import { SourceQuoteId } from "@ituri/shared";

import { FigureInteractive } from "./figure-interactive";
import type { SerializedQuote } from "./types";
import { SOURCE_ATTR_PATTERN } from "@/lib/copy";
import { getSourceQuoteById } from "@/lib/queries/source-quotes";

interface FigureProps {
  className?: string;
  quoteId: string;
  value: number | string;
}

async function Figure({ value, quoteId, className }: Readonly<FigureProps>) {
  const parsed = SourceQuoteId.safeParse(quoteId);
  if (!parsed.success) {
    return <span className={className}>{value}</span>;
  }

  const row = await getSourceQuoteById(parsed.data);
  if (!row) {
    return <span className={className}>{value}</span>;
  }

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
      : new Date(quote.publishedAt).toLocaleDateString("en", {
          month: "short",
          year: "numeric",
        });
  const description = SOURCE_ATTR_PATTERN.replace("{authority}", quote.sourceName).replace(
    "{date}",
    date,
  );

  return (
    <FigureInteractive
      value={value}
      quote={quote}
      description={description}
      {...(className !== undefined && { className })}
    />
  );
}

export { Figure };
