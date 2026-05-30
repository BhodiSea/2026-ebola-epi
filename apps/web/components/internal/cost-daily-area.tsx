"use client";

import { AnimatedAreaSeries, AnimatedAreaStack, Axis, XYChart } from "@visx/xychart";
import { useEffect, useRef, useState } from "react";

import type { DailyViewRow } from "@/app/internal/cost/page";

const MODEL_COLOURS: Record<string, string> = {
  opus: "hsl(270, 60%, 55%)",
  sonnet: "hsl(210, 70%, 50%)",
  haiku: "hsl(140, 60%, 45%)",
};

interface DayPoint {
  cost: number;
  day: string;
}

function modelColour(modelId: string): string {
  for (const [family, colour] of Object.entries(MODEL_COLOURS)) {
    if (modelId.includes(family)) {
      return colour;
    }
  }
  return "hsl(0, 0%, 50%)";
}

const xAccessor = (d: DayPoint) => d.day;
const yAccessor = (d: DayPoint) => d.cost;

export function CostDailyArea({ data }: Readonly<{ data: DailyViewRow[] }>) {
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

  const days = [...new Set(data.map((r) => r.day))].sort((a, b) => a.localeCompare(b));
  const models = [...new Set(data.map((r) => r.model_id))].sort((a, b) => a.localeCompare(b));

  const seriesByModel = new Map<string, DayPoint[]>();
  for (const model of models) {
    const costByDay = new Map(
      data.filter((r) => r.model_id === model).map((r) => [r.day, Number(r.total_cost)]),
    );
    seriesByModel.set(
      model,
      days.map((day) => ({ day, cost: costByDay.get(day) ?? 0 })),
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      role="img"
      aria-label="Daily LLM spend by model over the last 30 days"
    >
      <XYChart
        width={width}
        height={160}
        xScale={{ type: "band", paddingInner: 0.2 }}
        yScale={{ type: "linear", zero: true }}
      >
        <Axis orientation="bottom" numTicks={5} />
        <Axis orientation="left" numTicks={3} tickFormat={(v: number) => `$${v.toFixed(2)}`} />
        <AnimatedAreaStack>
          {models.map((model) => (
            <AnimatedAreaSeries
              key={model}
              dataKey={model}
              data={seriesByModel.get(model) ?? []}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
              fillOpacity={0.7}
              fill={modelColour(model)}
            />
          ))}
        </AnimatedAreaStack>
      </XYChart>
    </div>
  );
}
