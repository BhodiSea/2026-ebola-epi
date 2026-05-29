import type { SerializedQuote } from "@/components/provenance/types";

/** Wire shape returned by GET /api/zone/[code] — safe to import into Client Components. */

export type TimeWindow = "7d" | "30d" | "90d" | "all";

export interface ZoneDateFigure {
  description: null | string;
  quote: null | SerializedQuote;
  value: null | string;
}

export interface ZoneDetailResponse {
  code: string;
  documents: ZoneDocumentDto[];
  rawRows: ZoneRawRowDto[];
  series: { confirmed: ZoneSeriesPoint[]; deaths: ZoneSeriesPoint[] };
  sourceCount: number;
  totals: {
    cfr: null | number;
    confirmed: ZoneFigure;
    deaths: ZoneFigure;
    firstDetected: ZoneDateFigure;
  };
}

export interface ZoneDocumentDto {
  id: string;
  publishedAt: null | string;
  source: { licenseTier: string; name: string; slug: string };
  title: null | string;
  url: string;
}

export interface ZoneFigure {
  description: null | string;
  quote: null | SerializedQuote;
  value: number;
}

export interface ZoneRawRowDto {
  asOf: string;
  metric: string;
  sourceQuoteId: string;
  status: string;
  value: number;
}

export interface ZoneSeriesPoint {
  date: string;
  value: number;
}
