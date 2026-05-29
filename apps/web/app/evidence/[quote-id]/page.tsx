import { request } from "@arcjet/next";
import { SourceQuoteId } from "@ituri/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CitationCopier } from "@/components/provenance/citation-copier";
import { ProvenanceBadge, toTier } from "@/components/provenance/provenance-badge";
import type { SerializedCaseCount, SerializedQuote } from "@/components/provenance/types";
import { aj } from "@/lib/arcjet";
import { getFiguresUsingQuote, getSourceQuoteById } from "@/lib/queries/source-quotes";

/* eslint-disable @typescript-eslint/naming-convention */
interface EvidenceParams {
  "quote-id": string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export default async function EvidencePage({
  params,
}: Readonly<{ params: Promise<EvidenceParams> }>) {
  const req = await request();
  const decision = await aj.protect(req);
  if (decision.isDenied()) {
    notFound();
  }

  const resolvedParams = await params;
  const rawId = resolvedParams["quote-id"];
  const parsed = SourceQuoteId.safeParse(rawId);
  if (!parsed.success) {
    notFound();
  }

  const [row, caseCounts] = await Promise.all([
    getSourceQuoteById(parsed.data),
    getFiguresUsingQuote(parsed.data),
  ]);
  if (!row) {
    notFound();
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

  const serializedCounts: SerializedCaseCount[] = caseCounts.map((cc) => ({
    value: cc.value,
    geoAdmin2: cc.admin2_code,
    observedAt: cc.as_of,
  }));

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <ProvenanceBadge
          sourceName={quote.sourceName}
          tier={toTier(quote.licenseTier)}
          publishedAt={quote.publishedAt}
        />
        {quote.documentUrl === null ? null : (
          <a
            href={quote.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] text-fg-muted underline-offset-2 hover:underline"
          >
            Open original ↗
          </a>
        )}
      </header>

      <blockquote className="mb-8 border-accent border-l-2 pl-5 font-serif text-[16px] text-fg italic leading-relaxed">
        {quote.quoteText}
      </blockquote>

      <div className="flex flex-col gap-8">
        <FiguresList caseCounts={serializedCounts} />
        <CustodySection quote={quote} />
        <section>
          <h2 className="mb-3 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
            Citation
          </h2>
          <CitationCopier quote={quote} />
        </section>
      </div>
    </article>
  );
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<EvidenceParams> }>): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams["quote-id"];
  return {
    title: `Evidence: ${id.slice(0, 8)} — ituri-sitrep`,
    description: `Verbatim source evidence for figure ${id.slice(0, 8)}.`,
  };
}

function CustodySection({ quote }: Readonly<{ quote: SerializedQuote }>) {
  const rows = [
    { label: "Published", value: quote.publishedAt === null ? "—" : fmtDate(quote.publishedAt) },
    { label: "Extracted", value: fmtDate(quote.createdAt) },
    { label: "Reviewed", value: "—" },
    { label: "Anomaly", value: "—" },
    { label: "Confidence", value: "—" },
  ];
  return (
    <section>
      <h2 className="mb-3 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
        Chain of custody
      </h2>
      <table className="w-full text-[12px]">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-border border-t">
              <td className="py-1.5 font-mono text-fg-muted">{row.label}</td>
              <td className="py-1.5 font-mono text-fg">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FiguresList({ caseCounts }: Readonly<{ caseCounts: SerializedCaseCount[] }>) {
  if (caseCounts.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-3 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
        Used in {caseCounts.length} figure{caseCounts.length === 1 ? "" : "s"}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {caseCounts.map((cc) => (
          <li
            key={`${cc.geoAdmin2 ?? "null"}-${cc.observedAt ?? "null"}`}
            className="flex items-baseline justify-between font-mono text-[12px] text-fg"
          >
            <span>{cc.geoAdmin2 ?? "—"}</span>
            <span>{cc.value ?? "—"}</span>
            <span className="text-fg-muted">
              {cc.observedAt === null
                ? "—"
                : new Date(cc.observedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
