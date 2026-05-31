import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/env";
import { getDailyBriefByDate, listPublishedBriefs } from "@/lib/queries/daily-briefs";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";

export default async function BriefPage({
  params,
}: Readonly<{ params: Promise<{ date: string }> }>) {
  const { date } = await params;
  const data = await getDailyBriefByDate(date);

  if (data === null) {
    notFound();
  }

  const newsArticleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: `Bundibugyo Outbreak — What Changed (${date})`,
    datePublished: date,
    dateModified: date,
    url: `${siteUrl()}/brief/${date}`,
    author: { "@type": "Person", name: data.modelId, description: "AI summarisation" },
    publisher: { "@type": "Person", name: "Thomas Nicklin" },
    about: {
      "@type": "MedicalCondition",
      name: "Bundibugyo virus disease",
      code: { "@type": "MedicalCode", code: "1D60.00", codingSystem: "ICD-11" },
    },
  };

  const breadcrumbs = buildBreadcrumbs([
    { label: "Home", path: "/" },
    { label: `Daily Brief — ${date}`, path: `/brief/${date}` },
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <JsonLd schema={newsArticleSchema} />
      <JsonLd schema={breadcrumbs} />
      <header className="space-y-1">
        <p className="font-mono text-[11px] text-fg-muted uppercase tracking-wide">{data.date}</p>
        <h1 className="font-semibold text-2xl leading-snug">{data.headline}</h1>
        {data.severity === null ? null : (
          <span className="inline-block rounded bg-warn/20 px-1.5 py-0.5 font-mono text-[10px] text-warn uppercase">
            {data.severity}
          </span>
        )}
      </header>

      <div className="space-y-4">
        {data.body.split("\n\n").map((para) => (
          <p
            key={para.slice(0, 40)}
            className="font-source-serif-4 text-[17px] text-fg leading-[1.55]"
          >
            {para}
          </p>
        ))}
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ date: string }> }>): Promise<Metadata> {
  const { date } = await params;
  const data = await getDailyBriefByDate(date);
  return {
    title: `What Changed — ${date} | Bundibugyo Outbreak Daily Update`,
    description: data?.headline ?? `Daily outbreak brief for ${date}.`,
  };
}

export async function generateStaticParams(): Promise<{ date: string }[]> {
  return listPublishedBriefs();
}
