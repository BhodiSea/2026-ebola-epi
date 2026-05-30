import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Figure } from "@/components/provenance/figure";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ABOUT_AUTHOR_LINE,
  AI_GENERATED_LABEL,
  NO_OPERATIONAL_USE,
  PROVENANCE_HOOK,
} from "@/lib/copy";
import type { SourceQuoteRow } from "@/lib/queries/source-quotes";
import { getQuotesForMethodsPage } from "@/lib/queries/source-quotes";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Methods — ituri-sitrep",
  description: "How ituri-sitrep collects, extracts, and anchors data from public sitreps.",
  openGraph: {
    title: "Methods — ituri-sitrep",
    description:
      "Methodology and provenance model for the ituri-sitrep situational-awareness tool.",
  },
};

const DATASET_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "ituri-sitrep epidemiological signal dataset",
  description:
    "Structured epidemiological signals extracted from publicly released WHO DON, Africa CDC, and DRC MoH sitreps for the 2026 Ituri Bundibugyo virus outbreak.",
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Person", name: "Thomas Nicklin", email: "tnicklin@hawaii.edu" },
  keywords: ["Bundibugyo virus", "ebola", "outbreak", "DRC", "epidemiology", "sitrep"],
};

const BREADCRUMBS = buildBreadcrumbs([
  { label: "Home", path: "/" },
  { label: "Methods", path: "/methods" },
]);

export default async function MethodsPage() {
  const quotes = await getQuotesForMethodsPage();
  return (
    <>
      <JsonLd schema={DATASET_SCHEMA} />
      <JsonLd schema={BREADCRUMBS} />
      <MethodsArticle quotes={quotes} />
    </>
  );
}

function DataSourcesSection() {
  return (
    <Section heading="Data sources">
      <p>
        All ingested data is publicly released material. No line-list data, patient identifiers, or
        contact graphs are processed. Each source row carries a licence tier (open / display-only /
        non-commercial-verified / excluded) that governs export and redistribution. Display-only
        sources render aggregated overlays but never appear in any CSV export.
      </p>
    </Section>
  );
}

function ExtractionMethodSection() {
  return (
    <Section heading="Extraction method">
      <p>{AI_GENERATED_LABEL}</p>
      <p>
        The extraction pipeline uses Claude Opus 4.7 via the Anthropic API with prompt caching. Each
        run is keyed on a <code className="font-mono text-[14px]">prompt_version_hash</code>{" "}
        computed from the system prompt, few-shot examples, and tool schema. Re-processing with the
        same prompt produces exactly one extraction row per sitrep.
      </p>
      <p>
        Tool schemas are derived from zod via{" "}
        <code className="font-mono text-[14px]">zodToJsonSchema</code>. Character offsets into the
        source document anchor each extracted figure to its verbatim sentence.
      </p>
    </Section>
  );
}

function Icd11Section() {
  return (
    <Section heading="ICD-11 classification">
      <p className="font-mono text-[13px] text-fg-muted">
        The following ICD-11 codes are used in all JSON-LD schemas, extraction schemas, and rendered
        copy on this site. Verified against the WHO ICD-11 browser (icd.who.int).
      </p>
      <table className="w-full font-mono text-[13px]">
        <thead>
          <tr className="border-border border-b text-left text-fg-muted">
            <th className="pr-4 pb-2 font-medium">Entity</th>
            <th className="pr-4 pb-2 font-medium">ICD-11 Code</th>
            <th className="pb-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="py-2 pr-4">Bundibugyo virus disease</td>
            <td className="py-2 pr-4 font-semibold">1D60.00</td>
            <td className="py-2 text-fg-muted">Under 1D60.0 Ebola disease. Active outbreak.</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">Ebola virus disease (Zaire)</td>
            <td className="py-2 pr-4">1D60.01</td>
            <td className="py-2 text-fg-muted">Classic EBOV species.</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">Sudan virus disease</td>
            <td className="py-2 pr-4">1D60.02</td>
            <td className="py-2 text-fg-muted" />
          </tr>
          <tr>
            <td className="py-2 pr-4">Marburg virus disease</td>
            <td className="py-2 pr-4">1D60.10</td>
            <td className="py-2 text-fg-muted">Under 1D60.1 Marburg disease.</td>
          </tr>
        </tbody>
      </table>
    </Section>
  );
}

function LimitationsSection() {
  return (
    <Section heading="Limitations">
      <ul className="flex list-disc flex-col gap-2 pl-6">
        <li>
          Reporting lag: figures reflect the sitrep publication date, not event occurrence date.
        </li>
        <li>
          Geographic granularity varies by source. Health-zone attribution is imputed where not
          stated explicitly.
        </li>
        <li>
          Access constraints may cause multi-week data gaps for certain zones — absence of recent
          figures does not imply absence of cases.
        </li>
        <li>
          LLM extraction is probabilistic. All figures carry a review status; unreviewed figures are
          shown with an AI-generated label.
        </li>
      </ul>
    </Section>
  );
}

function MethodsArticle({ quotes }: Readonly<{ quotes: SourceQuoteRow[] }>) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-12 font-serif text-[16px] text-fg leading-relaxed">
      <header className="mb-10">
        <h1 className="mb-3 font-sans font-semibold text-[32px] text-fg leading-tight tracking-tight">
          Methods
        </h1>
        <p className="font-mono text-[13px] text-fg-muted">{PROVENANCE_HOOK}</p>
      </header>

      <ProvenanceAside quotes={quotes} />

      <Section heading="What this site does">
        <p>
          ituri-sitrep aggregates publicly released situation reports for the 2026 Ituri Bundibugyo
          virus outbreak and displays them in a health-zone-level map with a provenance-first UI.
          Every rendered figure on this site carries a{" "}
          <code className="font-mono text-[14px]">source_quote_id</code> foreign key linking it to
          the exact verbatim sentence in the source document.
        </p>
        <p>
          Sources ingested include: WHO Disease Outbreak News, WHO AFRO situation reports, Africa
          CDC bulletins, ECDC Rapid Risk Assessments, DRC MoH press releases, ACLED, HDX, and
          Pathoplexus/Nextstrain.
        </p>
      </Section>

      <Section heading="What it does not do">
        <p>{NO_OPERATIONAL_USE}</p>
        <p>
          This is not a forecasting platform, a clinical system, or a substitute for official
          communications from the DRC Ministry of Health or WHO Disease Outbreak News.
        </p>
      </Section>

      <DataSourcesSection />
      <ExtractionMethodSection />

      <Section heading="Provenance model">
        <p>
          Every renderable number is stored in{" "}
          <code className="font-mono text-[14px]">case_counts</code> with a non-nullable{" "}
          <code className="font-mono text-[14px]">source_quote_id</code>. The UI renders a dotted
          underline on any figure that has a linked quote. Hover to preview the source sentence;
          click to open the full evidence drawer with chain-of-custody metadata, citation, and a
          link to the original document.
        </p>
      </Section>

      <Icd11Section />
      <LimitationsSection />

      <Section heading="Author">
        <p>{ABOUT_AUTHOR_LINE}</p>
      </Section>

      <Section heading="Citation guidance">
        <p>
          Cite the primary source, not this tool. Each evidence drawer provides a formatted citation
          for the underlying document in plain text, BibTeX, and APA formats with a one-click copy
          button.
        </p>
      </Section>

      <Section heading="Code and licence">
        <p>
          Source code is available on GitHub under the MIT licence. Data derived from open-licence
          sources is available as CSV export from the Sources page. Display-only sources render
          aggregated overlays only and are excluded from any export or redistribution.
        </p>
      </Section>
    </article>
  );
}

function ProvenanceAside({ quotes }: Readonly<{ quotes: SourceQuoteRow[] }>) {
  if (quotes.length === 0) {
    return null;
  }
  return (
    <aside className="mb-10 flex flex-wrap gap-4 rounded-[--radius-md] bg-quote-bg px-5 py-4">
      <p className="w-full font-mono text-[12px] text-fg-muted">
        ↑ Hover a figure below to see provenance in action
      </p>
      {quotes.map((q) => (
        <Figure key={q.id} value={q.quote_text} quoteId={q.id} />
      ))}
    </aside>
  );
}

function Section({ heading, children }: Readonly<{ children: ReactNode; heading: string }>) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-sans font-semibold text-[20px] text-fg leading-snug">{heading}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
