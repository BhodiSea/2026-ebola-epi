import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import RSSParser from "rss-parser";

import type { FetchResult, ParseInput, ParseResult, RegisteredAdapter } from "../adapter.js";
import { fetchWithConditionalGet } from "../fetch-helper.js";

// Africa CDC does not provide a dedicated outbreak RSS; we use the general news feed
// and apply keyword filtering. Some article URLs require JavaScript rendering (Chromium)
// — those are gracefully skipped (reason: "chromium_required") rather than erroring.
const AFRICA_CDC_RSS_URL = "https://africacdc.org/feed/";

const OUTBREAK_KEYWORDS = [
  "bundibugyo",
  "ebola",
  "mpox",
  "monkeypox",
  "cholera",
  "marburg",
  "lassa",
  "plague",
  "outbreak",
  "epidemic",
  "sitrep",
  "situation report",
];

// Pages shorter than this after Readability parse are JS-rendered stubs.
const MIN_READABLE_CHARS = 200;

function isOutbreakItem(link: string, title: string): boolean {
  const haystack = `${link} ${title}`.toLowerCase();
  return OUTBREAK_KEYWORDS.some((kw) => haystack.includes(kw));
}

export const africaCDCAdapter: RegisteredAdapter = {
  sourceSlug: "africa-cdc",
  throttleKey: "africacdc.org",
  pollInterval: "0 8 * * *",

  async poll() {
    const parser = new RSSParser();
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(AFRICA_CDC_RSS_URL);
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
    const dom = new JSDOM(input.rawContent, { url: "https://africacdc.org/" });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article === null || article.textContent.trim().length < MIN_READABLE_CHARS) {
      // Short or null body = JS-rendered stub that Readability cannot extract.
      return { skipped: true, reason: "chromium_required" };
    }

    const htmlLang = dom.window.document.documentElement.lang.toLowerCase();
    const language = htmlLang.startsWith("fr") ? "fr" : "en";

    return {
      skipped: false,
      fullText: article.textContent,
      title: article.title,
      language,
    };
  },
};
