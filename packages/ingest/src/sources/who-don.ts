import { createHash } from "node:crypto";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import robotsParser from "robots-parser";
import RSSParser from "rss-parser";

const USER_AGENT = "ituri-sitrep/0.1 (+https://ituri-sitrep.example.org/about)";

// In-memory robots cache keyed by hostname (function-instance lifetime)
const robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

export interface ParsedDocument {
  fullText: string;
  html: string;
  sha256: Buffer;
  title: string;
}

export interface WhodonItem {
  publishedAt: string; // ISO string — survives Inngest JSON serialisation
  sourceSlug: "who-don";
  title: string;
  url: string;
}

export async function fetchAndParseDocument(url: string): Promise<ParsedDocument> {
  const origin = new URL(url).origin;
  const robots = await getRobots(origin);
  if (robots.isAllowed(url, USER_AGENT) === false) {
    throw new Error(`robots.txt disallows crawling ${url}`);
  }

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  const html = await res.text();
  const sha256 = createHash("sha256").update(html).digest();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  return {
    html,
    sha256,
    fullText: article?.textContent ?? "",
    title: article?.title ?? "",
  };
}

// DON-specific feed (feeds/entity/csr/don/en/rss.xml) was deprecated in 2026.
export const WHO_DON_FEED_URL = "https://www.who.int/rss-feeds/news-english.xml";

// Slugs/titles that indicate outbreak situation reports vs. general WHO news.
const OUTBREAK_KEYWORDS = [
  "ebola",
  "mpox",
  "monkeypox",
  "cholera",
  "plague",
  "hantavirus",
  "marburg",
  "lassa",
  "dengue",
  "outbreak",
  "epidemic",
  "disease-outbreak",
  "ihr-emergency",
  "pheic",
  "public-health-emergency",
];

export async function pollWHODON(): Promise<WhodonItem[]> {
  const parser = new RSSParser();
  const feed = await parser.parseURL(WHO_DON_FEED_URL);
  return feed.items.flatMap((item) => {
    if (item.link == null || item.link === "" || item.pubDate == null || item.pubDate === "") {
      return [];
    }
    if (!isOutbreakItem(item.link, item.title ?? "")) {
      return [];
    }
    return [
      {
        url: item.link,
        title: item.title ?? "",
        publishedAt: new Date(item.pubDate).toISOString(),
        sourceSlug: "who-don" as const,
      },
    ];
  });
}

async function getRobots(origin: string): Promise<ReturnType<typeof robotsParser>> {
  const cached = robotsCache.get(origin);
  if (cached !== undefined) {
    return cached;
  }
  const robotsUrl = `${origin}/robots.txt`;
  const res = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT } });
  // Non-200 (including 404) → treat as no robots.txt → allow all crawling (RFC 9309 §2.3.1.1)
  const content = res.ok ? await res.text() : "";
  const robots = robotsParser(robotsUrl, content);
  robotsCache.set(origin, robots);
  return robots;
}

function isOutbreakItem(link: string, title: string): boolean {
  const haystack = `${link} ${title}`.toLowerCase();
  return OUTBREAK_KEYWORDS.some((kw) => haystack.includes(kw));
}
