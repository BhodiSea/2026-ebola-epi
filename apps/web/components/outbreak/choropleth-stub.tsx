import type { ChoroplethData, ZoneData } from "@/lib/queries/choropleth";
import { getOutbreakZoneSvg } from "@/lib/queries/choropleth";

interface ChoroplethStubProps {
  outbreakId: string;
  viewMode?: "map" | "table";
}

const REDS = ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"] as const;

interface MapProps {
  globalBbox: { xmax: number; xmin: number; ymax: number; ymin: number };
  zones: ZoneData[];
}

function ChoroplethMap({ zones, globalBbox }: Readonly<MapProps>) {
  const { xmin, xmax, ymin, ymax } = globalBbox;
  const vbW = xmax === xmin ? 1 : xmax - xmin;
  const vbH = ymax === ymin ? 1 : ymax - ymin;
  const breaks = quantileBreaks(zones.map((zone) => zone.totalValue));

  return (
    <svg
      viewBox={`${xmin} ${-ymax} ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-labelledby="ch-title ch-desc"
    >
      <title id="ch-title">Case counts by health zone</title>
      <desc id="ch-desc">Choropleth map of confirmed cases per health zone</desc>
      <defs>
        <pattern
          id="no-data-hatch"
          width="0.04"
          height="0.04"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="0.04" stroke="#ccc" strokeWidth="0.01" />
        </pattern>
      </defs>
      {zones.map((zone) =>
        zone.svgPath === null ? null : (
          <path
            key={zone.admin2Code}
            d={zone.svgPath}
            fill={zoneColor(zone.totalValue, breaks)}
            stroke="white"
            strokeWidth="0.01"
          />
        ),
      )}
    </svg>
  );
}

async function ChoroplethStub({ outbreakId, viewMode = "map" }: Readonly<ChoroplethStubProps>) {
  const data = await getOutbreakZoneSvg(outbreakId);

  return (
    <div data-choropleth-stub className="overflow-hidden rounded-lg border bg-card">
      {renderContent(data, viewMode)}
    </div>
  );
}

function ChoroplethTable({ zones }: Readonly<{ zones: ZoneData[] }>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b font-mono text-[11px] text-fg-muted uppercase">
          <th className="py-1 text-left">Zone</th>
          <th className="py-1 text-right" data-numeric>
            Confirmed
          </th>
        </tr>
      </thead>
      <tbody>
        {zones.map((zone) => (
          <tr key={zone.admin2Code} className="border-b last:border-0">
            <td className="py-1">{zone.name}</td>
            <td className="py-1 text-right tabular-nums" data-numeric>
              {zone.totalValue}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function quantileBreaks(values: number[], n = 5): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [];
  for (let i = 1; i < n; i++) {
    breaks.push(sorted[Math.floor((i / n) * sorted.length)] ?? 0);
  }
  return breaks;
}

function renderContent(data: ChoroplethData | null, viewMode: string) {
  if (data === null || data.zones.length === 0) {
    return <p className="p-4 font-mono text-[12px] text-fg-muted">No geographic data available.</p>;
  }
  if (viewMode === "table") {
    return (
      <div className="p-4">
        <ChoroplethTable zones={data.zones} />
      </div>
    );
  }
  return <ChoroplethMap zones={data.zones} globalBbox={data.globalBbox} />;
}

function zoneColor(value: number, breaks: number[]): string {
  const idx = breaks.filter((b) => value > b).length;
  return REDS[idx] ?? REDS[0];
}

export { ChoroplethStub };
