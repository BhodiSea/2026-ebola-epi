"use client";

import { AnimatedAreaSeries, Axis, XYChart } from "@visx/xychart";
import { useEffect, useRef, useState } from "react";

import type { DailyPoint } from "@/app/internal/cost/page";

const xAccessor = (d: DailyPoint) => d.day;
const yAccessor = (d: DailyPoint) => d.cost;

export function CostDailyArea({ data }: Readonly<{ data: DailyPoint[] }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (el === null) {
      return () => {
        /* no cleanup needed */
      };
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full"
      role="img"
      aria-label="Daily LLM spend over the last 30 days"
    >
      <XYChart
        width={width}
        height={160}
        xScale={{ type: "band", paddingInner: 0.2 }}
        yScale={{ type: "linear", zero: true }}
      >
        <Axis orientation="bottom" numTicks={5} />
        <Axis orientation="left" numTicks={3} tickFormat={(v: number) => `$${v.toFixed(2)}`} />
        <AnimatedAreaSeries
          dataKey="spend"
          data={data}
          xAccessor={xAccessor}
          yAccessor={yAccessor}
          fillOpacity={0.3}
        />
      </XYChart>
    </div>
  );
}
