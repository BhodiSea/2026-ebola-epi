import { createHash } from "node:crypto";

import type { FetchResult, ParseResult, RegisteredAdapter } from "../adapter.js";

const API_BASE = "https://api.acleddata.com/acled/read";

// Fields requested from the ACLED API — enough for geographic access analysis.
const ACLED_FIELDS =
  "event_id_cnty|event_date|event_type|sub_event_type|country|admin1|admin2|admin3|location|latitude|longitude|fatalities|notes";

/* eslint-disable @typescript-eslint/naming-convention */
interface AcledEvent {
  admin1?: string;
  admin2?: string;
  admin3?: string;
  country?: string;
  event_date?: string;
  event_id_cnty?: string;
  event_type?: string;
  fatalities?: string;
  latitude?: string;
  location?: string;
  longitude?: string;
  notes?: string;
  sub_event_type?: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

interface AcledResponse {
  data?: AcledEvent[];
}

function formatWindowDates(): { endDate: string; startDate: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const start = new Date(startMs).toISOString().slice(0, 10);
  return { startDate: start, endDate: end };
}

export const acledAdapter: RegisteredAdapter = {
  sourceSlug: "acled",
  throttleKey: "api.acleddata.com",
  pollInterval: "0 4 * * *",

  // eslint-disable-next-line @typescript-eslint/require-await
  async poll() {
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation for process.env
    const token = process.env["ACLED_ACCESS_TOKEN"];
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation for process.env
    const email = process.env["ACLED_EMAIL"];
    if (token == null || token === "" || email == null || email === "") {
      return [];
    }

    const { startDate, endDate } = formatWindowDates();
    // Credentials are NOT included in the stored URL — fetch() injects them at call time.
    /* eslint-disable @typescript-eslint/naming-convention */
    const params = new URLSearchParams({
      country: "Democratic Republic of Congo|Uganda",
      event_date: `${startDate}|${endDate}`,
      event_date_where: "BETWEEN",
      limit: "500",
      fields: ACLED_FIELDS,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
    const batchUrl = `${API_BASE}?${params.toString()}`;

    return [
      {
        url: batchUrl,
        title: `ACLED conflict events DRC/Uganda ${startDate} to ${endDate}`,
        publishedAt: new Date().toISOString(),
      },
    ];
  },

  async fetch(url: string): Promise<FetchResult> {
    // Add credentials that were omitted from the stored URL to avoid leaking them to the DB.
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation for process.env
    const token = process.env["ACLED_ACCESS_TOKEN"] ?? "";
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket notation for process.env
    const email = process.env["ACLED_EMAIL"] ?? "";
    const u = new URL(url);
    u.searchParams.set("key", token);
    u.searchParams.set("email", email);

    const res = await fetch(u.toString());
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${url}`);
    }

    const rawContent = await res.text();
    const sha256 = createHash("sha256").update(rawContent).digest();

    return { skipped: false, rawContent, sha256, mimeType: "application/json" };
  },

  // eslint-disable-next-line @typescript-eslint/require-await
  async parse(raw: string): Promise<ParseResult> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSON.parse returns any; as unknown as T is the accepted safe-assertion idiom
    const json = JSON.parse(raw) as unknown as AcledResponse;
    const events = json.data ?? [];

    if (events.length === 0) {
      return { skipped: true, reason: "no_events_in_window" };
    }

    const lines = events.map(
      (e) =>
        `${e.event_date ?? "?"} | ${e.event_type ?? "?"} | ${e.admin2 ?? e.admin1 ?? "?"} | fatalities: ${e.fatalities ?? "0"} | ${e.notes ?? ""}`,
    );

    return {
      skipped: false,
      fullText: lines.join("\n"),
      title: `ACLED conflict events (${events.length} events)`,
      language: "en",
    };
  },
};
