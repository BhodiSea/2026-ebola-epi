import type { Map as MlMap } from "maplibre-gl";

export interface CaseOverlayHandle {
  remove: () => void;
  update: (points: CasePoint[], visible: boolean) => void;
}

export interface CasePoint {
  lat: number;
  lng: number;
  value: number;
}

interface RawFeature {
  geometry: unknown;
  properties: null | Record<string, unknown>;
}

/** deck.gl interleaved overlay (ADR-0013) for case centroids. Lazy-imported so deck.gl
 *  stays out of bundles for routes that don't render the map. */
export async function attachCaseOverlay(map: MlMap): Promise<CaseOverlayHandle> {
  const [{ MapboxOverlay }, { ScatterplotLayer }] = await Promise.all([
    import("@deck.gl/mapbox"),
    import("@deck.gl/layers"),
  ]);

  const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
  map.addControl(overlay);

  function update(points: CasePoint[], visible: boolean): void {
    const layers = visible
      ? [
          new ScatterplotLayer<CasePoint>({
            id: "case-centroids",
            data: points,
            getPosition: (d) => [d.lng, d.lat],
            getRadius: (d) => Math.max(180, Math.sqrt(d.value) * 360),
            radiusUnits: "meters",
            radiusMinPixels: 2,
            getFillColor: [239, 59, 44, 180],
            stroked: true,
            getLineColor: [153, 0, 13, 220],
            lineWidthMinPixels: 0.5,
            pickable: false,
          }),
        ]
      : [];
    overlay.setProps({ layers });
  }

  function remove(): void {
    map.removeControl(overlay);
  }

  return { update, remove };
}

/** Pull case centroids of a single `metric` out of MVT `cases` features (queried via
 *  querySourceFeatures). The `cases` source-layer carries every metric, so callers must filter to
 *  the one the overlay represents (the deck overlay is the "deaths" layer). querySourceFeatures
 *  returns the same feature once per covering tile, so dedupe by source_quote_id (stable per case)
 *  to avoid stacked points along tile-buffer bands. Pure + side-effect-free → unit-testable. */
export function casePointsFromFeatures(features: RawFeature[], metric: string): CasePoint[] {
  const points: CasePoint[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const keyed = keyedPointForMetric(f, metric);
    if (keyed !== null && !seen.has(keyed.key)) {
      seen.add(keyed.key);
      points.push(keyed.point);
    }
  }
  return points;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function keyedPointForMetric(
  f: RawFeature,
  metric: string,
): null | { key: string; point: CasePoint } {
  if (f.properties?.metric !== metric) {
    return null;
  }
  const geom: unknown = f.geometry;
  if (!isRecord(geom) || geom.type !== "Point" || !Array.isArray(geom.coordinates)) {
    return null;
  }
  const coordinates: unknown[] = geom.coordinates;
  const [lng, lat] = coordinates;
  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }
  const sq = f.properties.source_quote_id;
  const raw = f.properties.value;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return {
    key: typeof sq === "string" ? sq : `${lng},${lat}`,
    point: { lng, lat, value: Number.isFinite(value) ? value : 0 },
  };
}
