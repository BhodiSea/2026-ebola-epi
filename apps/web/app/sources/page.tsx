import "server-only";

import { SourceLibraryTable } from "@/components/sources/source-library-table";
import { listSources } from "@/lib/queries/sources";

export default async function SourcesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const initialQuery = typeof params.q === "string" ? params.q : "";

  const sources = await listSources();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-bold text-[24px]">Sources</h1>
        <span className="font-mono text-[12px] text-fg-muted">{sources.length} sources</span>
      </div>
      <p className="font-mono text-[13px] text-fg-muted">
        All public data sources indexed by ituri-sitrep. Each figure on this platform links back to
        its verbatim source sentence.
      </p>
      <SourceLibraryTable sources={sources} initialQuery={initialQuery} />
    </main>
  );
}
