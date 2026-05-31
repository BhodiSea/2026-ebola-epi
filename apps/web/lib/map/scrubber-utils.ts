import { scaleLinear, scaleTime } from "@visx/scale";

import type { TimeWindow } from "@/lib/map/zone-detail-response";

export interface ScrubberControls {
  onBrushChange: (bounds: null | { x1: Date | number }) => void;
  playing: boolean;
  selectedDate: string;
  stepBy: (delta: number) => void;
  togglePlay: () => void;
}

export interface ScrubberScales {
  brushYScale: YScale;
  xScale: XScale;
  yScale: YScale;
}
export interface SeriesPoint {
  date: string;
  value: number;
}

export type XScale = ReturnType<typeof timeScale>;

export type YScale = ReturnType<typeof linearScale>;

export const HEIGHT = 120;
export const CHART_TOP = 6;
export const CHART_BOTTOM = 70;
export const ACLED_Y = 84;
export const PAD_X = 8;
const DAY_MS = 86_400_000;
export const FALLBACK_DATE = "2020-01-01";
export const FALLBACK_DOMAIN: [Date, Date] = [
  new Date("2020-01-01T00:00:00Z"),
  new Date("2020-01-02T00:00:00Z"),
];
/* eslint-disable @typescript-eslint/naming-convention */
const WINDOW_DAYS: Record<Exclude<TimeWindow, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };
/* eslint-enable @typescript-eslint/naming-convention */

export function advanceDate(confirmed: SeriesPoint[], cur: string): string {
  const idx = confirmed.findIndex((p) => p.date >= cur);
  const next = idx === -1 || idx >= confirmed.length - 1 ? 0 : idx + 1;
  return confirmed[next]?.date ?? cur;
}

export function areaPath(series: SeriesPoint[], xScale: XScale, yScale: YScale): string {
  const first = series[0];
  const last = series.at(-1);
  if (first === undefined || last === undefined) {
    return "";
  }
  const top = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(new Date(p.date))},${yScale(p.value)}`)
    .join(" ");
  return `${top} L${xScale(new Date(last.date))},${CHART_BOTTOM} L${xScale(new Date(first.date))},${CHART_BOTTOM} Z`;
}

export function formatAnnounce(dateStr: string, confirmedCount: number): string {
  const { week, year } = isoWeek(dateStr);
  return `Showing week ${week} of ${year}, ${confirmedCount} confirmed cases`;
}

export function isoWeek(dateStr: string): { week: number; year: number } {
  const [yy = 0, mm = 1, dd = 1] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(yy, mm - 1, dd));
  const day = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / DAY_MS + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export function linearScale(domain: [number, number], range: [number, number]) {
  return scaleLinear<number>({ domain, range });
}

export function timeScale(domain: [Date, Date], range: [number, number]) {
  return scaleTime<number>({ domain, range });
}

/** Cumulative value at `date`: the most recent point on or before it. case_counts metrics
 *  are cumulative restatements (each sitrep reports a running total), so summing points across
 *  dates would double-count — the value at a date is the latest snapshot, not the sum. */
export function valueAt(series: SeriesPoint[], date: string): number {
  let bestDate: null | string = null;
  let value = 0;
  for (const p of series) {
    if (p.date <= date && (bestDate === null || p.date > bestDate)) {
      bestDate = p.date;
      value = p.value;
    }
  }
  return value;
}

export function windowCutoff(latestDate: string, window: TimeWindow): string {
  if (window === "all") {
    return "0000-01-01";
  }
  const d = new Date(`${latestDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS[window]);
  return d.toISOString().slice(0, 10);
}
