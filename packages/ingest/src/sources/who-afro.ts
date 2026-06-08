import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import RSSParser from "rss-parser";

import type { FetchResult, ParseInput, ParseResult, RegisteredAdapter } from "../adapter.js";
import { fetchWithConditionalGet } from "../fetch-helper.js";
import { parsePdf } from "../parse-pdf.js";

const WHO_AFRO_RSS_URL = "https://www.afro.who.int/rss.xml";

const OUTBREAK_KEYWORDS = [
  "bundibugyo",
  "ebola",
  "mpox",
  "marburg",
  "cholera",
  "plague",
  "lassa",
  "outbreak",
  "epidemic",
  "flambée",
  "épidémie",
  "maladie à virus",
  "disease outbreak",
];

function isOutbreakItem(link: string, title: string): boolean {
  const haystack = `${link} ${title}`.toLowerCase();
  return OUTBREAK_KEYWORDS.some((kw) => haystack.includes(kw));
}

export const whoAFROAdapter: RegisteredAdapter = {
  sourceSlug: "who-afro",
  throttleKey: "afro.who.int",
  pollInterval: "0 6 * * *",
  version: "1.0.0",

  async poll() {
    const parser = new RSSParser();
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(WHO_AFRO_RSS_URL);
    } catch {
      return [];
    }
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
        },
      ];
    });
  },

  async fetch(url: string): Promise<FetchResult> {
    return fetchWithConditionalGet(url);
  },

  async parse(input: ParseInput): Promise<ParseResult> {
    if (input.rawBytes !== undefined) {
      return parsePdf(input.rawBytes);
    }

    const dom = new JSDOM(input.rawContent, { url: "https://www.afro.who.int/" });
    // Detect language from <html lang="fr"> / <html lang="en"> attribute.
    const htmlLang = dom.window.document.documentElement.lang.toLowerCase();
    const language = htmlLang.startsWith("fr") ? "fr" : "en";

    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article === null) {
      return { skipped: true, reason: "readability_parse_failed" };
    }
    return {
      skipped: false,
      fullText: article.textContent,
      title: article.title,
      language,
    };
  },
};
