import "server-only";

import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ituri-epi.com";

function staticRoutePriority(path: string): number {
  if (path === "/") {
    return 1;
  }
  if (path === "/today") {
    return 0.9;
  }
  return 0.8;
}

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
  const supabase = await createClient();

  const [zonesResult, briefsResult] = await Promise.all([
    supabase.from("admin1").select("code").limit(200),
    supabase.from("daily_briefs").select("date").order("date", { ascending: false }).limit(30),
  ]);

  const zoneCodes: string[] = ((zonesResult.data ?? []) as { code: string }[]).map((r) => r.code);
  const briefDates: string[] = ((briefsResult.data ?? []) as { date: string }[]).map((r) => r.date);

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

  return [...staticEntries, ...zoneEntries, ...briefEntries];
}
