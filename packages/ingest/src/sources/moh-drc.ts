import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

import type { FetchResult, ParseResult, RegisteredAdapter } from "../adapter.js";
import { fetchWithConditionalGet } from "../fetch-helper.js";

// sante.gouv.cd lists epidemics at /epidemie; bulletin links contain /epidemie/<slug>.
// Link selector: a[href*="/epidemie/"] — fragile against site redesigns; documented here.
const LISTING_URL = "https://sante.gouv.cd/epidemie";
const BASE_URL = "https://sante.gouv.cd";

export const mohDRCAdapter: RegisteredAdapter = {
  sourceSlug: "moh-drc",
  throttleKey: "sante.gouv.cd",
  pollInterval: "0 10 * * *",

  async poll() {
    const result = await fetchWithConditionalGet(LISTING_URL);
    if (result.skipped) {
      return [];
    }

    const dom = new JSDOM(result.rawContent, { url: LISTING_URL });
    const anchors =
      dom.window.document.querySelectorAll<HTMLAnchorElement>('a[href*="/epidemie/"]');

    if (anchors.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    return [...anchors].flatMap((a) => {
      const href = a.getAttribute("href") ?? "";
      const url = href.startsWith("http") ? href : `${BASE_URL}${href}`;
      if (seen.has(url)) {
        return [];
      }
      seen.add(url);

      const title = a.textContent.trim();

      // Date from adjacent <time> element; fall back to today's UTC midnight.
      const timeEl = a.closest("li")?.querySelector("time");
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
  async parse(raw: string): Promise<ParseResult> {
    const dom = new JSDOM(raw, { url: BASE_URL });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article === null) {
      return { skipped: true, reason: "readability_parse_failed" };
    }

    return {
      skipped: false,
      fullText: article.textContent,
      title: article.title,
      // All MoH DRC content is published in French — hard-coded per spec.
      language: "fr",
    };
  },
};
