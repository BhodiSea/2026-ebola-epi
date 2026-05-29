"use client";

import { Brush } from "@visx/brush";

import type {
  ScrubberControls,
  ScrubberScales,
  SeriesPoint,
  XScale,
  YScale,
} from "@/lib/map/scrubber-utils";
import {
  ACLED_Y,
  areaPath,
  CHART_BOTTOM,
  CHART_TOP,
  HEIGHT,
  PAD_X,
} from "@/lib/map/scrubber-utils";
import type { TimeWindow } from "@/lib/map/zone-detail-response";

export function PlaybackControls({
  controls,
  confirmedCount,
  timeWindow,
  onCycleWindow,
}: Readonly<{
  confirmedCount: number;
  controls: ScrubberControls;
  onCycleWindow: (() => void) | undefined;
  timeWindow: TimeWindow;
}>) {
  const { playing, acledVisible, selectedDate, stepBy, togglePlay, toggleAcled } = controls;
  const subtle = "rounded px-1 text-[var(--color-fg-subtle)] text-xs hover:text-[var(--color-fg)]";
  return (
    <div className="flex items-center justify-center gap-1 pb-1">
      <button
        type="button"
        aria-label="Skip to start"
        onClick={() => stepBy(-confirmedCount)}
        className={subtle}
      >
        ◀◀
      </button>
      <button type="button" aria-label="Step back" onClick={() => stepBy(-1)} className={subtle}>
        ◀
      </button>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={togglePlay}
        className="rounded px-1 text-[var(--color-fg)] text-xs hover:text-[var(--color-accent)]"
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button type="button" aria-label="Step forward" onClick={() => stepBy(1)} className={subtle}>
        ▶
      </button>
      <button
        type="button"
        aria-label="Skip to end"
        onClick={() => stepBy(confirmedCount)}
        className={subtle}
      >
        ▶▶
      </button>
      <span className="mx-2 font-mono text-[10px] text-[var(--color-fg-subtle)] tabular-nums">
        {selectedDate}
      </span>
      <button
        type="button"
        aria-pressed={acledVisible}
        onClick={toggleAcled}
        className="rounded px-1 text-[10px] text-[var(--color-fg-subtle)] uppercase hover:text-[var(--color-fg)]"
      >
        ACLED
      </button>
      {onCycleWindow === undefined ? null : (
        <button
          type="button"
          aria-label="Cycle time window"
          onClick={onCycleWindow}
          className="rounded px-1 font-mono text-[10px] text-[var(--color-fg-subtle)] uppercase hover:text-[var(--color-fg)]"
        >
          {timeWindow}
        </button>
      )}
    </div>
  );
}

export function ScrubberSvg({
  width,
  scales,
  confirmed,
  deaths,
  sitrepDates,
  acledDates,
  acledVisible,
  selectedDate,
  onBrushChange,
}: Readonly<{
  acledDates: string[];
  acledVisible: boolean;
  confirmed: SeriesPoint[];
  deaths: SeriesPoint[];
  onBrushChange: (bounds: null | { x1: Date | number }) => void;
  scales: ScrubberScales;
  selectedDate: string;
  sitrepDates: string[];
  width: number;
}>) {
  const { xScale, yScale, brushYScale } = scales;
  const playheadX = xScale(new Date(selectedDate));
  return (
    <svg width={width} height={HEIGHT - 24} className="min-h-0 flex-1" role="presentation">
      <Areas confirmed={confirmed} deaths={deaths} xScale={xScale} yScale={yScale} />
      <RuleMarks
        dates={sitrepDates}
        xScale={xScale}
        y1={CHART_TOP}
        y2={CHART_BOTTOM}
        prefix="sitrep"
        stroke="var(--color-fg-subtle)"
        dashed
      />
      {acledVisible ? (
        <RuleMarks
          dates={acledDates}
          xScale={xScale}
          y1={ACLED_Y - 6}
          y2={ACLED_Y + 6}
          prefix="acled"
          stroke="#d97706"
        />
      ) : null}
      <line
        x1={playheadX}
        x2={playheadX}
        y1={CHART_TOP}
        y2={ACLED_Y + 8}
        stroke="var(--color-accent)"
        strokeWidth={1.5}
      />
      <Brush
        xScale={xScale}
        yScale={brushYScale}
        width={Math.max(width - PAD_X * 2, 1)}
        height={CHART_BOTTOM - CHART_TOP}
        margin={{ top: CHART_TOP, left: PAD_X, right: PAD_X, bottom: HEIGHT - CHART_BOTTOM }}
        brushDirection="horizontal"
        resizeTriggerAreas={["left", "right"]}
        onChange={onBrushChange}
        selectedBoxStyle={{
          fill: "var(--color-accent)",
          fillOpacity: 0.12,
          stroke: "var(--color-accent)",
        }}
      />
    </svg>
  );
}

function Areas({
  confirmed,
  deaths,
  xScale,
  yScale,
}: Readonly<{ confirmed: SeriesPoint[]; deaths: SeriesPoint[]; xScale: XScale; yScale: YScale }>) {
  return (
    <>
      <path
        d={areaPath(confirmed, xScale, yScale)}
        fill="var(--color-reds-3)"
        fillOpacity={0.4}
        stroke="var(--color-reds-4)"
      />
      <path
        d={areaPath(deaths, xScale, yScale)}
        fill="var(--color-fg-muted)"
        fillOpacity={0.3}
        stroke="var(--color-fg-muted)"
      />
    </>
  );
}

function RuleMarks({
  dates,
  xScale,
  y1,
  y2,
  prefix,
  stroke,
  dashed = false,
}: Readonly<{
  dashed?: boolean;
  dates: string[];
  prefix: string;
  stroke: string;
  xScale: XScale;
  y1: number;
  y2: number;
}>) {
  return (
    <>
      {dates.map((d) => (
        <line
          key={`${prefix}-${d}`}
          x1={xScale(new Date(d))}
          x2={xScale(new Date(d))}
          y1={y1}
          y2={y2}
          stroke={stroke}
          strokeWidth={dashed ? 1 : 1.5}
          {...(dashed ? { strokeDasharray: "2 2" } : {})}
        />
      ))}
    </>
  );
}
