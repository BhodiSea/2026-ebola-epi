import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";

import { getSourceBySlug } from "@/lib/queries/sources";

export default async function SourceDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const source = await getSourceBySlug(slug);

  if (source === null) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div>
        <nav className="mb-2 font-mono text-[12px] text-fg-muted">
          <Link href="/sources" className="text-accent hover:underline">
            Sources
          </Link>
          {" › "}
          {source.name}
        </nav>
        <h1 className="font-bold text-[28px]">{source.name}</h1>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[13px] text-accent hover:underline"
        >
          {source.url}
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-4 font-mono text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-fg-muted">Trust score</dt>
          <dd className="font-semibold" data-numeric>
            {source.trustScore.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">Licence tier</dt>
          <dd className="font-semibold">{source.licenseTier.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Documents indexed</dt>
          <dd className="font-semibold" data-numeric>
            {source.docCount}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">Last fetch</dt>
          <dd className="font-semibold">{formatDate(source.lastFetch)}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">Attribution required</dt>
          <dd className="font-semibold">{source.attributionRequired ? "Yes" : "No"}</dd>
        </div>
      </dl>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h2 className="font-mono text-[13px] text-fg-muted uppercase">Licence posture</h2>
        <p className="font-source-serif-4 text-[17px] leading-[1.55]">{source.postureTerms}</p>
        <p className="font-mono text-[12px] text-fg-muted">{source.postureAttribution}</p>
      </section>

      {source.licenseUrl === null ? null : (
        <a
          href={source.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[13px] text-accent hover:underline"
        >
          View full licence →
        </a>
      )}
    </main>
  );
}

function formatDate(iso: null | string): string {
  if (iso === null) {
    return "never";
  }
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
