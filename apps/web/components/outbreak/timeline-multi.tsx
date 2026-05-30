"use client";

import { Axis, LineSeries, XYChart } from "@visx/xychart";
import { useEffect, useRef, useState } from "react";

import type { SparklinePoint } from "@/lib/queries/case-counts";

interface TimelineMultiProps {
  asOfDate?: string;
  confirmedSeries: SparklinePoint[];
  deathsSeries: SparklinePoint[];
  peakConfirmed?: number;
}

const xAccessor = (d: SparklinePoint) => d.date;
const yAccessor = (d: SparklinePoint) => d.value;

function TimelineMulti({
  confirmedSeries,
  deathsSeries,
  asOfDate,
  peakConfirmed,
}: Readonly<TimelineMultiProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setWidth(entry.contentRect.width);
      }
    });
    if (el !== null) {
      ro.observe(el);
    }
    return () => {
      ro.disconnect();
    };
  }, []);

  const height = 200;

  const dateLabel = asOfDate ?? "latest available date";
  const peakLabel = peakConfirmed === undefined ? "" : ` Peak weekly confirmed: ${peakConfirmed}.`;

  return (
    <div
      ref={containerRef}
      className="w-full"
      role="img"
      aria-label={`Line chart of confirmed cases and deaths by week, as of ${dateLabel}.${peakLabel}`}
    >
      <XYChart
        width={width}
        height={height}
        xScale={{ type: "band", paddingInner: 0.3 }}
        yScale={{ type: "linear", zero: true }}
      >
        <Axis orientation="bottom" numTicks={5} />
        <Axis orientation="left" numTicks={4} />
        <LineSeries
          dataKey="confirmed"
          data={confirmedSeries}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
        />
        <LineSeries
          dataKey="deaths"
          data={deathsSeries}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
        />
      </XYChart>
      <div className="mt-1 flex gap-4 font-mono text-[13px] text-fg-muted">
        <span>— Confirmed</span>
        <span>— Deaths</span>
      </div>
    </div>
  );
}

export { TimelineMulti };
