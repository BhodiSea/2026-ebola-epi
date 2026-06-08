import "server-only";

import type { Document } from "@/lib/queries/documents";
import { listSitreps } from "@/lib/queries/documents";

export default async function SitrepPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const source = typeof params.source === "string" ? params.source : undefined;
  const page = typeof params.page === "string" ? Number(params.page) : 1;

  const sitreps = await listSitreps({ ...(source !== undefined && { source }), page });
  const groups = groupByDate(sitreps);
  const sourceParam = source === undefined ? "" : `&source=${encodeURIComponent(source)}`;
  const chips = source === undefined ? deriveSourceChips(sitreps) : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-bold text-[24px]">Situation Reports</h1>
        <span className="font-mono text-[12px] text-fg-muted">{sitreps.length} documents</span>
      </div>

      <SourceFilterBar source={source} chips={chips} />

      {sitreps.length === 0 ? (
        <p className="font-mono text-[13px] text-fg-muted">
          No situation reports match your filters yet.
        </p>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([dateKey, docs]) => (
            <DateGroup key={dateKey} dateKey={dateKey} docs={docs} />
          ))}
        </div>
      )}

      <div className="flex gap-4 font-mono text-[12px]">
        {page > 1 ? (
          <a
            href={`/sitreps?page=${page - 1}${sourceParam}`}
            className="text-accent hover:underline"
          >
            ← Previous
          </a>
        ) : null}
        {sitreps.length === 25 ? (
          <a
            href={`/sitreps?page=${page + 1}${sourceParam}`}
            className="text-accent hover:underline"
          >
            Next →
          </a>
        ) : null}
      </div>
    </main>
  );
}

function DateGroup({ dateKey, docs }: Readonly<{ dateKey: string; docs: Document[] }>) {
  return (
    <section data-date-group={dateKey}>
      <h2 className="mb-3 border-b pb-1 font-mono text-[12px] text-fg-muted uppercase">
        {dateKey === "unknown" ? "Date unknown" : formatDateGroup(`${dateKey}T00:00:00Z`)}
      </h2>
      <div className="space-y-1">
        {docs.map((doc) => (
          <SitrepRow key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}

function deriveSourceChips(docs: Document[]): { name: string; slug: string }[] {
  const seen = new Set<string>();
  const chips: { name: string; slug: string }[] = [];
  for (const doc of docs) {
    if (!seen.has(doc.source.slug)) {
      seen.add(doc.source.slug);
      chips.push({ slug: doc.source.slug, name: doc.source.name });
    }
  }
  return chips.sort((a, b) => a.name.localeCompare(b.name));
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  // timeZone: "UTC" prevents date roll-back on servers west of UTC.
  return d.toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function groupByDate(docs: Document[]) {
  const groups = new Map<string, Document[]>();
  for (const doc of docs) {
    const key = doc.publishedAt === null ? "unknown" : doc.publishedAt.slice(0, 10);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [doc]);
    } else {
      group.push(doc);
    }
  }
  return groups;
}

function SitrepRow({ doc }: Readonly<{ doc: Document }>) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" data-sitrep-row>
      <div className="min-w-0 flex-1">
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-semibold underline-offset-2 hover:underline"
        >
          {doc.title ?? doc.url}
        </a>
        <span className="font-mono text-[12px] text-fg-muted">{doc.source.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <a
          href={`/document/${doc.id}`}
          className="font-mono text-[12px] text-accent hover:underline"
        >
          View extraction →
        </a>
        {doc.publishedAt === null ? null : (
          <span className="font-mono text-[12px] text-fg-muted tabular-nums">
            {new Date(doc.publishedAt).toLocaleTimeString("en", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

function SourceFilterBar({
  source,
  chips,
}: Readonly<{ chips: { name: string; slug: string }[]; source: string | undefined }>) {
  return (
    <div className="flex flex-wrap gap-2" data-sitrep-filters>
      {chips.map(({ slug, name }) => (
        <a
          key={slug}
          href={`/sitreps?source=${encodeURIComponent(slug)}`}
          className="rounded border border-border px-2 py-1 font-mono text-[12px] text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          {name}
        </a>
      ))}
      {source === undefined ? null : (
        <span className="rounded border bg-card px-2 py-1 font-mono text-[12px]">
          source: {source}
        </span>
      )}
      {source === undefined ? null : (
        <a
          href="/sitreps"
          className="font-mono text-[12px] text-accent underline-offset-2 hover:underline"
        >
          Clear filters
        </a>
      )}
    </div>
  );
}
