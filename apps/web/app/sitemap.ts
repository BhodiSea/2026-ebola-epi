import "server-only";

import type { MetadataRoute } from "next";

import { listPublishedBriefs } from "@/lib/queries/daily-briefs";
import { listRecentDocuments } from "@/lib/queries/documents";
import { listAdmin2Codes } from "@/lib/queries/zones";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com";

const STATIC_ROUTES = [
  "/",
  "/today",
  "/outbreaks",
  "/methods",
  "/sources",
  "/about/data-sources",
  "/feed.xml",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [zones, briefs, recentDocs] = await Promise.all([
    listAdmin2Codes(),
    listPublishedBriefs(),
    listRecentDocuments(50),
  ]);

  const zoneCodes: string[] = zones.map((z) => z.code);
  const briefDates: string[] = briefs.map((b) => b.date);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "daily" as const,
    priority: staticRoutePriority(path),
  }));

  const zoneEntries: MetadataRoute.Sitemap = zoneCodes.map((code) => ({
    url: `${SITE_URL}/zone/${code}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const briefEntries: MetadataRoute.Sitemap = briefDates.map((date) => ({
    url: `${SITE_URL}/brief/${date}`,
    changeFrequency: "never",
    priority: 0.6,
  }));

  const documentEntries: MetadataRoute.Sitemap = recentDocs.map((doc) => ({
    url: `${SITE_URL}/document/${doc.id}`,
    lastModified: doc.ingestedAt,
    changeFrequency: "never",
    priority: 0.6,
  }));

  return [...staticEntries, ...zoneEntries, ...briefEntries, ...documentEntries];
}

function staticRoutePriority(path: string): number {
  if (path === "/") {
    return 1;
  }
  if (path === "/today") {
    return 0.9;
  }
  return 0.8;
}
