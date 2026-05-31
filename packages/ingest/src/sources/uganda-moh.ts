import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import type { FetchResult, ParseInput, ParseResult, RegisteredAdapter } from "../adapter.js";
import { fetchWithConditionalGet } from "../fetch-helper.js";

// health.go.ug lists press releases at /press-releases/; entry URLs are relative paths.
// Link selector: "article a" — fragile against site redesigns; documented here.
const LISTING_URL = "https://www.health.go.ug/press-releases/";
const BASE_URL = "https://www.health.go.ug";

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
  "sudan",
  "sitrep",
  "situation report",
];

function isOutbreakItem(url: string, title: string): boolean {
  const haystack = `${url} ${title}`.toLowerCase();
  return OUTBREAK_KEYWORDS.some((kw) => haystack.includes(kw));
}

export const ugandaMOHAdapter: RegisteredAdapter = {
  sourceSlug: "uganda-moh",
  throttleKey: "health.go.ug",
  pollInterval: "0 10 * * *",

  async poll() {
    const result = await fetchWithConditionalGet(LISTING_URL);
    if (result.skipped) {
      return [];
    }

    const dom = new JSDOM(result.rawContent, { url: LISTING_URL });
    const anchors = dom.window.document.querySelectorAll<HTMLAnchorElement>("article a");

    if (anchors.length === 0) {
      return [];
    }

    return [...anchors].flatMap((a) => {
      // a.href is resolved to an absolute URL by JSDOM when url option is set.
      const url = a.href;
      const title = a.textContent.trim();

      if (!isOutbreakItem(url, title)) {
        return [];
      }

      // Date from adjacent <time> element; fall back to today's UTC midnight.
      const timeEl = a.closest("article")?.querySelector("time");
      const datetime = timeEl?.getAttribute("datetime");
      const publishedAt =
        datetime != null && datetime !== ""
          ? new Date(datetime).toISOString()
          : new Date(new Date().toISOString().slice(0, 10)).toISOString();

      return [{ url, title, publishedAt }];
    });
  },

  async fetch(url: string): Promise<FetchResult> {
    return fetchWithConditionalGet(url);
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async parse(input: ParseInput): Promise<ParseResult> {
    const dom = new JSDOM(input.rawContent, { url: BASE_URL });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article === null) {
      return { skipped: true, reason: "readability_parse_failed" };
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
