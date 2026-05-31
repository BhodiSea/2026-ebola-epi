import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import RSSParser from "rss-parser";

import type { FetchResult, ParseInput, ParseResult, RegisteredAdapter } from "../adapter.js";
import { fetchWithConditionalGet } from "../fetch-helper.js";

const ECDC_CDTR_RSS_URL =
  "https://www.ecdc.europa.eu/en/publications-data/communicable-disease-threats-report/feed";

const OUTBREAK_KEYWORDS = [
  "bundibugyo",
  "ebola",
  "mpox",
  "marburg",
  "cholera",
  "plague",
  "lassa",
  "haemorrhagic fever",
  "outbreak",
  "epidemic",
];

function isOutbreakItem(link: string, title: string): boolean {
  const haystack = `${link} ${title}`.toLowerCase();
  return OUTBREAK_KEYWORDS.some((kw) => haystack.includes(kw));
}

export const ecdcCDTRAdapter: RegisteredAdapter = {
  sourceSlug: "ecdc-cdtr",
  throttleKey: "www.ecdc.europa.eu",
  pollInterval: "0 8 * * 5",

  async poll() {
    const parser = new RSSParser();
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(ECDC_CDTR_RSS_URL);
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async parse(input: ParseInput): Promise<ParseResult> {
    const dom = new JSDOM(input.rawContent, { url: "https://www.ecdc.europa.eu/" });
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
