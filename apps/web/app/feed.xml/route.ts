import "server-only";

import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com";

/* eslint-disable @typescript-eslint/naming-convention */
interface FeedDoc {
  full_text: null | string;
  id: string;
  ingested_at: string;
  published_at: null | string;
  source: null | { name: string; slug: string }[];
  title: null | string;
  url: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export async function GET(): Promise<Response> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("documents")
    .select("id, title, url, published_at, ingested_at, full_text, source:sources(slug, name)")
    .order("published_at", { ascending: false })
    .limit(50);

  const docs = (data ?? []) as FeedDoc[];

  const first = docs[0];
  const updated =
    first === undefined ? new Date().toISOString() : (first.published_at ?? first.ingested_at);

  const entries = docs.map((d) => entryXml(d)).join("\n");

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${SITE_URL}/feed.xml</id>
  <title>ituri-sitrep — Bundibugyo virus outbreak</title>
  <subtitle>Publicly released sitrep signals for the 2026 Ituri outbreak</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" />
  <link href="${SITE_URL}/" />
  <updated>${updated}</updated>
${entries}
</feed>`;

  return new Response(feed, {
    headers: {
      "cache-control": "public, max-age=900",
      "content-type": "application/atom+xml; charset=utf-8",
    },
  });
}

function entryXml(doc: FeedDoc): string {
  const title = escapeXml(doc.title ?? doc.url);
  const updated = doc.published_at ?? doc.ingested_at;
  const link = `${SITE_URL}/document/${doc.id}`;
  const sourceName = escapeXml(
    Array.isArray(doc.source) ? (doc.source[0]?.name ?? "Unknown") : "Unknown",
  );
  const fullText = doc.full_text ?? "";
  const summaryText = escapeXml(fullText.length > 200 ? `${fullText.slice(0, 200)}…` : fullText);
  const summaryEl =
    summaryText.length > 0 ? `\n    <summary type="text">${summaryText}</summary>` : "";
  return `  <entry>
    <id>${link}</id>
    <title>${title}</title>
    <link href="${link}" />${summaryEl}
    <updated>${updated}</updated>
    <author><name>${sourceName}</name></author>
  </entry>`;
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
