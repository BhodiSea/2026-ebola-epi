"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlaybackControls, ScrubberSvg } from "./scrubber-parts";
import type { ScrubberControls, ScrubberScales, SeriesPoint } from "@/lib/map/scrubber-utils";
import {
  advanceDate,
  CHART_BOTTOM,
  CHART_TOP,
  FALLBACK_DATE,
  FALLBACK_DOMAIN,
  formatAnnounce,
  linearScale,
  PAD_X,
  timeScale,
  valueAt,
  windowCutoff,
} from "@/lib/map/scrubber-utils";
import type { TimeWindow } from "@/lib/map/zone-detail-response";

interface TimeScrubberProps {
  confirmedSeries: SeriesPoint[];
  deathsSeries: SeriesPoint[];
  onCycleWindow?: () => void;
  outbreakId: string;
  sitrepDates: string[];
  timeWindow?: TimeWindow;
}

const DAY_MS = 86_400_000;

export function TimeScrubber({
  confirmedSeries,
  deathsSeries,
  sitrepDates,
  outbreakId: _outbreakId,
  timeWindow = "all",
  onCycleWindow,
}: Readonly<TimeScrubberProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);

  const latestDate = confirmedSeries.at(-1)?.date ?? FALLBACK_DATE;
  const cutoff = windowCutoff(latestDate, timeWindow);
  const confirmed = useMemo(
    () => confirmedSeries.filter((p) => p.date >= cutoff),
    [confirmedSeries, cutoff],
  );
  const deaths = useMemo(
    () => deathsSeries.filter((p) => p.date >= cutoff),
    [deathsSeries, cutoff],
  );

  const scales = useScrubberScales(confirmed, width);
  const controls = useScrubberControls(confirmed, latestDate);
  const announce = useMemo(
    () => formatAnnounce(controls.selectedDate, valueAt(confirmed, controls.selectedDate)),
    [controls.selectedDate, confirmed],
  );

  return (
    <div
      ref={containerRef}
      className="relative flex h-[120px] w-full flex-col border-[var(--color-border)] border-t bg-[var(--color-surface-1)]"
      data-time-scrubber=""
    >
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      <ScrubberSvg
        width={width}
        scales={scales}
        confirmed={confirmed}
        deaths={deaths}
        sitrepDates={sitrepDates}
        selectedDate={controls.selectedDate}
        onBrushChange={controls.onBrushChange}
      />
      <PlaybackControls
        controls={controls}
        confirmedCount={confirmed.length}
        timeWindow={timeWindow}
        onCycleWindow={onCycleWindow}
      />
    </div>
  );
}

function useContainerWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined && w > 0) {
        setWidth(w);
      }
    });
    if (el !== null) {
      ro.observe(el);
    }
    return () => {
      ro.disconnect();
    };
  }, [ref]);
  return width;
}

function usePlayback(
  playing: boolean,
  confirmed: SeriesPoint[],
  setSelectedDate: (updater: (cur: string) => string) => void,
) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (playing) {
      const reduce = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
      interval = setInterval(
        () => {
          setSelectedDate((cur) => advanceDate(confirmed, cur));
        },
        reduce ? 600 : 350,
      );
    }
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [playing, confirmed, setSelectedDate]);
}

function useScrubberControls(confirmed: SeriesPoint[], latestDate: string): ScrubberControls {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get("as_of") ?? latestDate);
  const [playing, setPlaying] = useState(false);
  const commitTimer = useRef<null | ReturnType<typeof setTimeout>>(null);

  const commitDate = useCallback(
    (iso: string) => {
      setSelectedDate(iso);
      if (commitTimer.current !== null) {
        clearTimeout(commitTimer.current);
      }
      commitTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("as_of", iso);
        router.replace(`?${params.toString()}`, { scroll: false });
      }, 50);
    },
    [router, searchParams],
  );

  const stepBy = useCallback(
    (delta: number) => {
      if (confirmed.length === 0) {
        return;
      }
      const idx = confirmed.findIndex((p) => p.date >= selectedDate);
      const base = idx === -1 ? confirmed.length - 1 : idx;
      const next = Math.min(Math.max(base + delta, 0), confirmed.length - 1);
      const target = confirmed[next];
      if (target !== undefined) {
        commitDate(target.date);
      }
    },
    [confirmed, selectedDate, commitDate],
  );

  const onBrushChange = useCallback(
    (bounds: null | { x1: Date | number }) => {
      if (bounds === null) {
        return;
      }
      const ms = typeof bounds.x1 === "number" ? bounds.x1 : bounds.x1.getTime();
      commitDate(new Date(ms).toISOString().slice(0, 10));
    },
    [commitDate],
  );

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);
  usePlayback(playing, confirmed, setSelectedDate);

  return { selectedDate, playing, stepBy, onBrushChange, togglePlay };
}

function useScrubberScales(confirmed: SeriesPoint[], width: number): ScrubberScales {
  const domain = useMemo<[Date, Date]>(() => {
    if (confirmed.length === 0) {
      return FALLBACK_DOMAIN;
    }
    const times = confirmed.map((p) => new Date(p.date).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    return [new Date(min), new Date(max === min ? max + DAY_MS : max)];
  }, [confirmed]);
  const xScale = useMemo(
    () => timeScale(domain, [PAD_X, Math.max(width - PAD_X, PAD_X + 1)]),
    [domain, width],
  );
  const maxValue = useMemo(() => Math.max(1, ...confirmed.map((p) => p.value)), [confirmed]);
  const yScale = useMemo(() => linearScale([0, maxValue], [CHART_BOTTOM, CHART_TOP]), [maxValue]);
  const brushYScale = useMemo(() => linearScale([0, 1], [CHART_BOTTOM, CHART_TOP]), []);
  return { xScale, yScale, brushYScale };
}
