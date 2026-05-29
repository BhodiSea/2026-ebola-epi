import type { ExpressionSpecification, FilterSpecification, Map as MlMap } from "maplibre-gl";

export const MVT_SOURCE = "mvt-zones";
const ZONES_LAYER = "zones";

/** ColorBrewer Reds 5-class sequential, driven by per-zone feature-state caseCount. */
const ZONE_FILL_COLOR: ExpressionSpecification = [
  "step",
  ["coalesce", ["feature-state", "caseCount"], 0],
  "#fff5f0",
  1,
  "#fee0d2",
  10,
  "#fc9272",
  50,
  "#ef3b2c",
  100,
  "#99000d",
];

/** Hide the choropleth fill on zones with no data so the hatch layer shows through.
 *  hasData lets us distinguish a genuine zero from an absent measurement. */
const ZONE_FILL_OPACITY: ExpressionSpecification = [
  "case",
  ["coalesce", ["feature-state", "hasData"], false],
  0.78,
  0,
];

export interface LoadedZone {
  code: string;
  name: string;
}

/** Register the MVT vector source (with promoteId so feature-state keys on `code`),
 *  the no-data hatch image, the choropleth fill, the zone borders, and the focus ring. */
export function addZoneLayers(map: MlMap, tileUrl: string): void {
  map.addSource(MVT_SOURCE, {
    type: "vector",
    tiles: [tileUrl],
    minzoom: 0,
    maxzoom: 14,
    promoteId: { [ZONES_LAYER]: "code" },
  });
  if (!map.hasImage("hatch")) {
    map.addImage("hatch", createHatchImage(16));
  }
  map.addLayer({
    id: "zones-hatch",
    type: "fill",
    source: MVT_SOURCE,
    "source-layer": ZONES_LAYER,
    paint: { "fill-pattern": "hatch", "fill-opacity": 0.9 },
  });
  map.addLayer({
    id: "zones-fill",
    type: "fill",
    source: MVT_SOURCE,
    "source-layer": ZONES_LAYER,
    paint: { "fill-color": ZONE_FILL_COLOR, "fill-opacity": ZONE_FILL_OPACITY },
  });
  map.addLayer({
    id: "zones-line",
    type: "line",
    source: MVT_SOURCE,
    "source-layer": ZONES_LAYER,
    paint: { "line-color": "#888", "line-width": 0.5 },
  });
  // Focus ring = white casing under a near-black line. The two colours bracket the ColorBrewer
  // Reds ramp: white clears WCAG 1.4.11 non-text contrast (>=3:1) on the dark buckets, the dark
  // line clears it on the light buckets, so the selected outline is always perceivable. (3:1 is
  // the applicable graphical-object threshold; 7:1 is the AAA *text* ratio and does not apply.)
  map.addLayer({
    id: "selected-zone-casing",
    type: "line",
    source: MVT_SOURCE,
    "source-layer": ZONES_LAYER,
    filter: ["==", ["get", "code"], "__none__"],
    paint: { "line-color": "#ffffff", "line-width": 5 },
  });
  map.addLayer({
    id: "selected-zone",
    type: "line",
    source: MVT_SOURCE,
    "source-layer": ZONES_LAYER,
    filter: ["==", ["get", "code"], "__none__"],
    paint: { "line-color": "#0b1020", "line-width": 2 },
  });
}

/** Drive the choropleth feature-state from the current per-zone counts. Loaded zones absent from
 *  the new counts are CLEARED (not left stale): when the time-scrubber moves back, zones with no
 *  data yet at that date drop out of caseCountsByCode and must fall back to the no-data hatch
 *  instead of keeping a future colour. A genuine 0 stays coloured (0 !== undefined). */
export function applyZoneFeatureStates(
  map: MlMap,
  caseCountsByCode: Record<string, number>,
  loadedCodes: Iterable<string>,
): void {
  for (const code of loadedCodes) {
    if (caseCountsByCode[code] === undefined) {
      map.removeFeatureState({ source: MVT_SOURCE, sourceLayer: ZONES_LAYER, id: code });
    }
  }
  for (const [code, count] of Object.entries(caseCountsByCode)) {
    map.setFeatureState(
      { source: MVT_SOURCE, sourceLayer: ZONES_LAYER, id: code },
      { caseCount: count, hasData: true },
    );
  }
}

/** Diagonal-hatch RGBA pattern for "no data" zones (not gray). Returned shape is accepted
 *  directly by map.addImage(). */
export function createHatchImage(size = 16): { data: Uint8Array; height: number; width: number } {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if ((x + y) % 8 < 2) {
        data[i] = 120;
        data[i + 1] = 120;
        data[i + 2] = 130;
        data[i + 3] = 150;
      } else {
        data[i + 3] = 0;
      }
    }
  }
  return { width: size, height: size, data };
}

export function cycleZone(
  zones: LoadedZone[],
  currentCode: null | string,
  direction: "next" | "prev",
): LoadedZone | null {
  if (zones.length === 0) {
    return null;
  }
  const idx = zones.findIndex((z) => z.code === currentCode);
  let nextIdx: number;
  if (direction === "prev") {
    nextIdx = idx <= 0 ? zones.length - 1 : idx - 1;
  } else {
    nextIdx = idx === -1 || idx >= zones.length - 1 ? 0 : idx + 1;
  }
  return zones[nextIdx] ?? null;
}

export function getLoadedZones(map: MlMap): LoadedZone[] {
  const features = map.querySourceFeatures(MVT_SOURCE, { sourceLayer: ZONES_LAYER });
  const byCode = new Map<string, string>();
  for (const f of features) {
    // maplibre types `properties` as a non-null record, but it can be null at runtime.
    const props: unknown = f.properties;
    const code = readString(props, "code");
    if (code !== null && !byCode.has(code)) {
      byCode.set(code, readString(props, "name") ?? code);
    }
  }
  return [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Wire click-to-select (reading the zone's code/name) and a pointer hover cursor.
 *  `getOnSelect` is read lazily so the latest callback is always used. */
export function registerZoneInteractions(
  map: MlMap,
  getOnSelect: () => ((zone: LoadedZone) => void) | undefined,
): void {
  map.on("click", "zones-fill", (e) => {
    const props: unknown = e.features?.[0]?.properties;
    const code = readString(props, "code");
    if (code !== null) {
      getOnSelect()?.({ code, name: readString(props, "name") ?? code });
    }
  });
  map.on("mouseenter", "zones-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "zones-fill", () => {
    map.getCanvas().style.cursor = "";
  });
}

export function setSelectedZone(map: MlMap, code: null | string): void {
  if (map.getLayer("selected-zone") === undefined) {
    return;
  }
  // Feature-state can't be used in a layer filter, so the focus ring filters on the
  // rendered `code` property. "__none__" is a sentinel that matches no real zone code.
  const filter: FilterSpecification = ["==", ["get", "code"], code ?? "__none__"];
  map.setFilter("selected-zone-casing", filter);
  map.setFilter("selected-zone", filter);
}

export function setZoneVisibility(map: MlMap, active: Set<string>): void {
  if (map.getLayer("zones-fill") !== undefined) {
    map.setLayoutProperty("zones-fill", "visibility", visibility(active.has("confirmed")));
  }
  if (map.getLayer("zones-hatch") !== undefined) {
    map.setLayoutProperty("zones-hatch", "visibility", visibility(active.has("confirmed")));
  }
  if (map.getLayer("zones-line") !== undefined) {
    map.setLayoutProperty(
      "zones-line",
      "visibility",
      visibility(active.has("admin2") || active.has("admin1")),
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(source: unknown, key: string): null | string {
  if (!isRecord(source)) {
    return null;
  }
  const value = source[key];
  return typeof value === "string" ? value : null;
}

function visibility(on: boolean): "none" | "visible" {
  return on ? "visible" : "none";
}
