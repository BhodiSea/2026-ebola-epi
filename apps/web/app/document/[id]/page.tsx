import "server-only";

import { notFound } from "next/navigation";

import { Figure } from "@/components/provenance/figure";
import type { Document } from "@/lib/queries/documents";
import { getDocumentById } from "@/lib/queries/documents";
import type { DocumentFigure } from "@/lib/queries/figures";
import { getFiguresForDocument } from "@/lib/queries/figures";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com";

export default async function DocumentPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [doc, figures] = await Promise.all([getDocumentById(id), getFiguresForDocument(id)]);

  if (doc === null) {
    notFound();
  }

  const publishedDate =
    doc.publishedAt === null
      ? null
      : new Date(doc.publishedAt).toLocaleDateString("en", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
          year: "numeric",
        });

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <DocumentHeader doc={doc} publishedDate={publishedDate} />
      <ProvenanceSection doc={doc} />
      <FiguresSection figures={figures} />
    </main>
  );
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (doc === null) {
    return { title: "Document not found" };
  }
  const label = doc.title ?? doc.url;
  const date = doc.publishedAt === null ? "" : ` ${doc.publishedAt.slice(0, 10)}`;
  return {
    title: {
      absolute: `${doc.source.name}${date} — Extracted Data & Source Quotes | ituri-sitrep`,
    },
    description: `Source-linked extracted figures from: ${label}`,
    openGraph: {
      url: `${SITE_URL}/document/${id}`,
      title: label,
    },
  };
}

function DocumentHeader({
  doc,
  publishedDate,
}: Readonly<{ doc: Document; publishedDate: null | string }>) {
  return (
    <header className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-bold text-[22px] leading-snug">{doc.title ?? doc.url}</h1>
        <LicensePill tier={doc.source.licenseTier} />
      </div>
      <div className="flex flex-wrap items-center gap-4 font-mono text-[12px] text-fg-muted">
        <span>{doc.source.name}</span>
        {publishedDate === null ? null : <span>{publishedDate}</span>}
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          View source ↗
        </a>
      </div>
    </header>
  );
}

function FigureRow({ fig }: Readonly<{ fig: DocumentFigure }>) {
  const displayValue = fig.value === null ? "—" : String(fig.value);
  return (
    <tr className="border-border/50 border-b">
      <td className="py-1.5 pr-4 capitalize">{fig.metric}</td>
      <td className="py-1.5 pr-4 tabular-nums">
        <Figure value={displayValue} quoteId={fig.sourceQuoteId} />
      </td>
      <td className="py-1.5 pr-4 text-fg-muted">{fig.asOf ?? "—"}</td>
      <td className="max-w-[40ch] truncate py-1.5 text-fg-muted" title={fig.quote.text}>
        {fig.quote.text}
      </td>
    </tr>
  );
}

function FiguresSection({ figures }: Readonly<{ figures: DocumentFigure[] }>) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[12px] text-fg-muted uppercase tracking-wide">
        Extracted figures ({figures.length})
      </h2>
      {figures.length === 0 ? (
        <p className="font-mono text-[12px] text-fg-muted">
          No published figures for this document.
        </p>
      ) : (
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="border-border border-b text-left text-fg-muted">
              <th className="pr-4 pb-1">Metric</th>
              <th className="pr-4 pb-1">Value</th>
              <th className="pr-4 pb-1">As of</th>
              <th className="pb-1">Quote</th>
            </tr>
          </thead>
          <tbody>
            {figures.map((fig) => (
              <FigureRow key={fig.id} fig={fig} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LicensePill({ tier }: Readonly<{ tier: string }>) {
  /* eslint-disable @typescript-eslint/naming-convention */
  const colours: Record<string, string> = {
    display_only: "bg-yellow-100 text-yellow-800",
    excluded: "bg-red-100 text-red-800",
    noncommercial_verified: "bg-blue-100 text-blue-800",
    open: "bg-green-100 text-green-800",
  };
  /* eslint-enable @typescript-eslint/naming-convention */
  const cls = colours[tier] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded px-2 py-0.5 font-mono text-[10px] uppercase ${cls}`}>{tier}</span>
  );
}

function ProvenanceSection({ doc }: Readonly<{ doc: Document }>) {
  return (
    <section className="rounded-md border border-border bg-bg p-4 font-mono text-[12px]">
      <h2 className="mb-3 text-fg-muted uppercase tracking-wide">Provenance</h2>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-1 md:grid-cols-4">
        <dt className="text-fg-muted">Source</dt>
        <dd>{doc.source.name}</dd>
        <dt className="text-fg-muted">Ingested</dt>
        <dd>{doc.ingestedAt.slice(0, 10)}</dd>
        <dt className="text-fg-muted">Trust score</dt>
        <dd>{doc.source.trustScore}</dd>
        <dt className="text-fg-muted">License</dt>
        <dd>{doc.source.licenseTier}</dd>
      </dl>
    </section>
  );
}
