export interface SerializedCaseCount {
  geoAdmin2: null | string;
  observedAt: null | string;
  value: null | number;
}

/** Serializable quote data safe to pass across the Server→Client boundary. */
export interface SerializedQuote {
  charEnd: number;
  charStart: number;
  createdAt: string;
  documentUrl: null | string;
  id: string;
  licenseTier: string;
  publishedAt: null | string;
  quoteText: string;
  sourceName: string;
  sourceSlug: string;
}
