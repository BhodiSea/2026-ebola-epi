"use client";

import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InspectorTabs } from "./inspector-tabs";
import type { OutbreakOption } from "./layer-rail";
import { LayerRail } from "./layer-rail";
import type { ZoneSelection } from "./map-pane";
import { MapPane } from "./map-pane";
import { TimeScrubber } from "./time-scrubber";
import { createMapKeyboard } from "@/lib/map/keyboard";
import { parseLayers } from "@/lib/map/layers";
import type { TimeWindow } from "@/lib/map/zone-detail-response";

const WINDOW_ORDER: TimeWindow[] = ["7d", "30d", "90d", "all"];

interface MapClientShellProps {
  caseCountsByCode: Record<string, number>;
  confirmedSeries: SeriesPoint[];
  deathsSeries: SeriesPoint[];
  outbreakId: string;
  outbreaks: OutbreakOption[];
  sitrepDates: string[];
}

interface SeriesPoint {
  date: string;
  value: number;
}

export function MapClientShell({
  outbreakId,
  confirmedSeries,
  deathsSeries,
  sitrepDates,
  caseCountsByCode,
  outbreaks,
}: Readonly<MapClientShellProps>) {
  const { resolvedTheme } = useTheme();
  const keyboard = useMemo(() => createMapKeyboard(), []);
  const searchParams = useSearchParams();
  const activeLayers = useMemo(() => parseLayers(searchParams.get("layers")), [searchParams]);

  const [selected, setSelected] = useState<null | ZoneSelection>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");
  const zoneCounts = useZoneCounts(outbreakId, searchParams.get("as_of"), caseCountsByCode);

  const onSelectZone = useCallback((zone: ZoneSelection) => {
    setSelected(zone);
  }, []);

  const cycleWindow = useCallback(() => {
    setTimeWindow(
      (w) => WINDOW_ORDER[(WINDOW_ORDER.indexOf(w) + 1) % WINDOW_ORDER.length] ?? "all",
    );
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", keyboard.handleKeyDown);
    const unsubscribe = keyboard.subscribe((ev) => {
      if (ev.type === "cycleTime") {
        cycleWindow();
      }
    });
    return () => {
      document.removeEventListener("keydown", keyboard.handleKeyDown);
      unsubscribe();
    };
  }, [keyboard, cycleWindow]);

  return (
    <div className="flex h-full min-h-0">
      <LayerRail outbreakId={outbreakId} keyboard={keyboard} outbreaks={outbreaks} />
      <div className="flex min-h-0 flex-1 flex-col">
        <MapPane
          outbreakId={outbreakId}
          keyboard={keyboard}
          caseCountsByCode={zoneCounts}
          activeLayers={activeLayers}
          selected={selected}
          onSelectZone={onSelectZone}
          terrain={activeLayers.has("terrain")}
          sentinel={activeLayers.has("sentinel")}
          {...(resolvedTheme === undefined ? {} : { theme: resolvedTheme })}
        />
        <TimeScrubber
          confirmedSeries={confirmedSeries}
          deathsSeries={deathsSeries}
          sitrepDates={sitrepDates}
          outbreakId={outbreakId}
          timeWindow={timeWindow}
          onCycleWindow={cycleWindow}
        />
      </div>
      <InspectorTabs
        outbreakId={outbreakId}
        timeWindow={timeWindow}
        {...(selected === null ? {} : { selectedAdmin1: selected })}
      />
    </div>
  );
}

/** Choropleth totals: server-provided current totals by default; when the TimeScrubber sets
 *  ?as_of, fetch the cumulative published totals known at that date so the map re-colours. */
function useZoneCounts(
  outbreakId: string,
  asOf: null | string,
  initial: Record<string, number>,
): Record<string, number> {
  const [fetched, setFetched] = useState<null | Record<string, number>>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    if (asOf !== null) {
      const url = `/api/zone-totals?outbreak_id=${encodeURIComponent(outbreakId)}&as_of=${encodeURIComponent(asOf)}`;
      async function load() {
        try {
          const res = await fetch(url, { signal: ctrl.signal });
          if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- trusted internal /api/zone-totals JSON
            setFetched((await res.json()) as Record<string, number>);
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setFetched(null);
          }
        }
      }
      void load();
    }
    return () => {
      ctrl.abort();
    };
  }, [asOf, outbreakId]);
  return asOf === null ? initial : (fetched ?? initial);
}
