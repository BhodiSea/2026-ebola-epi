import "server-only";

import type { Source } from "@/lib/queries/sources";
import { listSources } from "@/lib/queries/sources";

/* eslint-disable @typescript-eslint/naming-convention */
const TIER_LABEL: Record<string, string> = {
  open: "Open",
  noncommercial_verified: "Non-commercial (verified)",
  display_only: "Display only",
  excluded: "Excluded",
};
/* eslint-enable @typescript-eslint/naming-convention */

const TIER_ORDER = ["open", "noncommercial_verified", "display_only", "excluded"];

export default async function AboutDataSourcesPage() {
  const sources = await listSources();
  const byTier = groupByTier(sources);

  return (
    <main className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <header className="space-y-3">
        <h1 className="font-bold text-[28px]">Data sources & terms of use</h1>
        <p className="font-source-serif-4 text-[17px] text-fg-muted leading-[1.55]">
          ituri-sitrep ingests publicly released documents. Every figure carries a verbatim source
          quote and a licence tier that governs how it may be used downstream.
        </p>
      </header>

      {TIER_ORDER.map((tier) => {
        const tierSources = byTier.get(tier) ?? [];
        if (tierSources.length === 0) {
          return null;
        }
        return <TierSection key={tier} tier={tier} sources={tierSources} />;
      })}

      {sources.length === 0 ? (
        <p className="font-mono text-[13px] text-fg-muted">No sources indexed yet.</p>
      ) : null}
    </main>
  );
}

function groupByTier(sources: Source[]): Map<string, Source[]> {
  const byTier = new Map<string, Source[]>();
  for (const tier of TIER_ORDER) {
    byTier.set(tier, []);
  }
  for (const source of sources) {
    const list = byTier.get(source.licenseTier);
    if (list !== undefined) {
      list.push(source);
    }
  }
  return byTier;
}

function TierSection({ tier, sources }: Readonly<{ sources: Source[]; tier: string }>) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-[14px] text-fg-muted uppercase">{TIER_LABEL[tier] ?? tier}</h2>
      <div className="space-y-6">
        {sources.map((source) => (
          <div key={source.id} className="space-y-2" data-source-posture={source.slug}>
            <div className="flex items-baseline gap-3">
              <a
                href={`/sources/${source.slug}`}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {source.name}
              </a>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] text-accent hover:underline"
              >
                {source.url}
              </a>
            </div>
            <p className="font-source-serif-4 text-[16px] leading-[1.55]">{source.postureTerms}</p>
            <p className="font-mono text-[12px] text-fg-muted">{source.postureAttribution}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
