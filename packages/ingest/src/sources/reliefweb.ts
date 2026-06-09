import { createHash } from "node:crypto";

import { JSDOM } from "jsdom";

import type { FetchResult, ParseInput, ParseResult, RegisteredAdapter } from "../adapter.js";
import { ConfiguredSkipError } from "../configured-skip-error.js";

const API_BASE = "https://api.reliefweb.int/v1/reports";

// ISO 639-2/T codes returned by the RW API mapped to ISO 639-1 for ParseResult.
const LANG_MAP: Record<string, string> = {
  eng: "en",
  fra: "fr",
  spa: "es",
  por: "pt",
  ara: "ar",
};

const BODY_TOO_SHORT = 100;
const FIELDS_INCLUDE = "fields[include][]";

export interface ReliefwebCreds {
  appname?: string | undefined;
}

interface RWFields {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- ReliefWeb API field name contains a hyphen; cannot rename
  "body-html"?: string;
  date?: { created?: string };
  language?: { code: string; name?: string }[];
  title?: string;
}

export function makeReliefwebAdapter(creds: ReliefwebCreds): RegisteredAdapter {
  return {
    sourceSlug: "reliefweb",
    throttleKey: "api.reliefweb.int",
    pollInterval: "0 12 * * *",
    version: "1.0.0",

    async poll() {
      const appname = creds.appname;
      if (appname == null || appname === "") {
        throw new ConfiguredSkipError("RELIEFWEB_APPNAME is not configured");
      }

      /* eslint-disable @typescript-eslint/naming-convention */
      const params = new URLSearchParams({
        appname,
        "filter[operator]": "AND",
        "filter[conditions][0][field]": "country.iso3",
        "filter[conditions][1][field]": "theme.name",
        "filter[conditions][1][value]": "Health",
        "sort[]": "date.created:desc",
        limit: "10",
      });
      /* eslint-enable @typescript-eslint/naming-convention */
      params.append("filter[conditions][0][value][]", "COD");
      params.append("filter[conditions][0][value][]", "UGA");
      params.append(FIELDS_INCLUDE, "title");
      params.append(FIELDS_INCLUDE, "body-html");
      params.append(FIELDS_INCLUDE, "date");
      params.append(FIELDS_INCLUDE, "language");

      const res = await fetch(`${API_BASE}?${params.toString()}`);
      if (!res.ok) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
      const json = (await res.json()) as unknown as { data?: { fields: RWFields; id: string }[] };
      const items = json.data ?? [];

      return items.map((item) => ({
        url: `https://reliefweb.int/report/${item.id}`,
        title: item.fields.title ?? "",
        publishedAt:
          item.fields.date?.created == null
            ? new Date().toISOString()
            : new Date(item.fields.date.created).toISOString(),
      }));
    },

    async fetch(url: string): Promise<FetchResult> {
      const appname = creds.appname;
      if (appname == null || appname === "") {
        throw new ConfiguredSkipError("RELIEFWEB_APPNAME is not configured");
      }
      // URL shape: https://reliefweb.int/report/<id>
      const reportId = new URL(url).pathname.split("/").filter(Boolean)[1] ?? "";
      const params = new URLSearchParams({ appname });
      params.append(FIELDS_INCLUDE, "title");
      params.append(FIELDS_INCLUDE, "body-html");
      params.append(FIELDS_INCLUDE, "date");
      params.append(FIELDS_INCLUDE, "language");

      const apiUrl = `${API_BASE}/${reportId}?${params.toString()}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${apiUrl}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- res.json() returns any; as unknown as T is the accepted safe-assertion idiom
      const json = (await res.json()) as unknown as { data?: { fields?: RWFields } };
      const fields: RWFields = json.data?.fields ?? {};
      const rawContent = JSON.stringify(fields);
      const sha256 = createHash("sha256").update(rawContent).digest();

      return { skipped: false, rawContent, sha256, mimeType: "application/json" };
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async parse(input: ParseInput): Promise<ParseResult> {
      return parseReliefwebFields(input.rawContent);
    },
  };
}

function parseReliefwebFields(rawContent: string): ParseResult {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; as unknown as T is the accepted safe-assertion idiom
  const fields = JSON.parse(rawContent) as unknown as RWFields;
  const bodyHtml = fields["body-html"];

  if (bodyHtml == null || bodyHtml === "") {
    return { skipped: true, reason: "empty_body" };
  }

  const fullText = stripHtml(bodyHtml);
  if (fullText.length < BODY_TOO_SHORT) {
    return { skipped: true, reason: "body_too_short" };
  }

  const langCode = fields.language?.[0]?.code ?? "eng";
  const language = LANG_MAP[langCode] ?? "en";

  return {
    skipped: false,
    fullText,
    title: fields.title ?? "",
    language,
  };
}

function stripHtml(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  return dom.window.document.body.textContent.replaceAll(/\s+/g, " ").trim();
}

// Backward-compat singleton — reads from process.env at call time.
export const reliefwebAdapter: RegisteredAdapter = makeReliefwebAdapter({
  get appname() {
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature (TS4111) requires bracket notation for process.env
    return process.env["RELIEFWEB_APPNAME"];
  },
});
