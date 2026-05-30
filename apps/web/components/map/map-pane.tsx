"use client";

import maplibregl from "maplibre-gl";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CaseOverlayHandle } from "@/lib/map/case-overlay";
import { attachCaseOverlay, casePointsFromFeatures } from "@/lib/map/case-overlay";
import type { MapKeyboard, MapKeyboardEvent } from "@/lib/map/keyboard";
import { resolveStyle, SENTINEL_ATTRIBUTION, SENTINEL_TILES, TERRAIN_TILES } from "@/lib/map/style";
import { TILE_VERSION } from "@/lib/map/tile-version";
import type { LoadedZone } from "@/lib/map/zone-layers";
import {
  addZoneLayers,
  applyZoneFeatureStates,
  cycleZone,
  getLoadedZones,
  MVT_SOURCE,
  registerZoneInteractions,
  setSelectedZone,
  setZoneVisibility,
} from "@/lib/map/zone-layers";

const PAN_STEP = 100;

export interface ZoneSelection {
  code: string;
  name: string;
}

interface InitOpts {
  containerRef: RefObject<HTMLDivElement | null>;
  live: RefObject<LiveProps>;
  loadedZonesRef: RefObject<LoadedZone[]>;
  mapRef: RefObject<maplibregl.Map | null>;
  outbreakId: string;
  overlayRef: RefObject<CaseOverlayHandle | null>;
  theme: string | undefined;
}

interface KeyContext {
  currentCode: null | string;
  onSelect: ((zone: ZoneSelection) => void) | undefined;
  zones: LoadedZone[];
}

interface LiveProps {
  activeLayers: Set<string> | undefined;
  caseCountsByCode: Record<string, number>;
  onSelectZone: ((zone: ZoneSelection) => void) | undefined;
  selected: null | ZoneSelection;
  sentinel: boolean;
  terrain: boolean;
}

interface MapPaneProps {
  activeLayers?: Set<string>;
  ariaLabel: string;
  caseCountsByCode?: Record<string, number>;
  keyboard: MapKeyboard;
  onSelectZone?: (zone: ZoneSelection) => void;
  outbreakId: string;
  selected?: null | ZoneSelection;
  sentinel?: boolean;
  terrain?: boolean;
  theme?: string;
}

/* ─── map mutation helpers (top-level so the component stays small) ──────────── */

interface RefreshCtx {
  live: LiveProps;
  loadedZonesRef: RefObject<LoadedZone[]>;
  overlayRef: RefObject<CaseOverlayHandle | null>;
}

export function MapPane({
  outbreakId,
  keyboard,
  caseCountsByCode = {},
  activeLayers,
  selected = null,
  onSelectZone,
  terrain = false,
  sentinel = false,
  theme,
  ariaLabel,
}: Readonly<MapPaneProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<CaseOverlayHandle | null>(null);
  const loadedZonesRef = useRef<LoadedZone[]>([]);
  const live = useLiveRef<LiveProps>({
    caseCountsByCode,
    activeLayers,
    selected,
    onSelectZone,
    terrain,
    sentinel,
  });

  useEffect(
    () => initMap({ containerRef, mapRef, overlayRef, loadedZonesRef, live, outbreakId, theme }),
    [outbreakId, theme, live],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded() === true) {
      applyZoneFeatureStates(
        map,
        caseCountsByCode,
        getLoadedZones(map).map((z) => z.code),
      );
    }
  }, [caseCountsByCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded() === true) {
      setSelectedZone(map, selected?.code ?? null);
    }
  }, [selected]);

  useEffect(() => {
    syncLayerVisibility(mapRef.current, overlayRef, activeLayers);
  }, [activeLayers]);

  useEffect(() => {
    toggleTerrain(mapRef.current, terrain);
  }, [terrain]);

  useEffect(() => {
    toggleSentinel(mapRef.current, sentinel);
  }, [sentinel]);

  useMapKeyboard({ keyboard, live, loadedZonesRef, mapRef });

  return (
    <div
      ref={containerRef}
      id="map-pane"
      role="application"
      tabIndex={-1}
      aria-roledescription="Interactive health-zone map"
      aria-label={ariaLabel}
      data-map-pane=""
      className="relative h-full min-h-0 flex-1 bg-[var(--color-surface-1)]"
    />
  );
}

function addSentinel(map: maplibregl.Map) {
  if (map.getSource("sentinel-2") === undefined) {
    map.addSource("sentinel-2", {
      type: "raster",
      tiles: [SENTINEL_TILES],
      tileSize: 256,
      attribution: SENTINEL_ATTRIBUTION,
    });
  }
  if (map.getLayer("sentinel-2-layer") === undefined) {
    map.addLayer({ id: "sentinel-2-layer", type: "raster", source: "sentinel-2" }, "zones-hatch");
  }
}

function addTerrain(map: maplibregl.Map) {
  if (map.getSource("terrain-rgb") === undefined) {
    map.addSource("terrain-rgb", {
      type: "raster-dem",
      tiles: [TERRAIN_TILES],
      encoding: "terrarium",
      maxzoom: 14,
      attribution: "© Copernicus DEM (ESA/Airbus/DLR open licence)",
    });
  }
  map.setTerrain({ source: "terrain-rgb", exaggeration: 1.5 });
}

function applyPan(map: maplibregl.Map, direction: MapKeyboardEvent["direction"]) {
  const canvas = map.getCanvas();
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const dx = axisDelta(direction, "left", "right");
  const dy = axisDelta(direction, "up", "down");
  map.panTo(map.unproject([cx + dx, cy + dy]), motionOptions());
}

async function attachOverlayAndRefresh(
  map: maplibregl.Map,
  opts: InitOpts,
  refresh: () => void,
): Promise<void> {
  // attachCaseOverlay awaits two dynamic imports; the map may be torn down (unmount / theme
  // change) before they resolve. mapRef stops pointing at this map in that case — dispose the
  // freshly-created overlay instead of leaking its deck.gl WebGL context onto a dead map.
  const handle = await attachCaseOverlay(map);
  if (opts.mapRef.current !== map) {
    handle.remove();
    return;
  }
  opts.overlayRef.current = handle;
  refresh();
}

function axisDelta(direction: MapKeyboardEvent["direction"], neg: string, pos: string): number {
  if (direction === neg) {
    return -PAN_STEP;
  }
  if (direction === pos) {
    return PAN_STEP;
  }
  return 0;
}

function dispatchMapKey(map: maplibregl.Map, ev: MapKeyboardEvent, ctx: KeyContext) {
  switch (ev.type) {
    case "cycleFeature": {
      const next = cycleZone(ctx.zones, ctx.currentCode, ev.direction === "prev" ? "prev" : "next");
      if (next !== null) {
        ctx.onSelect?.(next);
      }

      break;
    }
    case "pan": {
      applyPan(map, ev.direction);

      break;
    }
    case "zoom": {
      if (ev.direction === "in") {
        map.zoomIn(motionOptions());
      } else {
        map.zoomOut(motionOptions());
      }

      break;
    }
    default: {
      break;
    }
  }
}

function initMap(opts: InitOpts): () => void {
  const container = opts.containerRef.current;
  if (container !== null) {
    const map = new maplibregl.Map({
      container,
      style: resolveStyle(opts.theme),
      center: [30.05, 1.55],
      zoom: 7,
    });
    opts.mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    const refresh = () => {
      refreshMap(map, {
        live: opts.live.current,
        overlayRef: opts.overlayRef,
        loadedZonesRef: opts.loadedZonesRef,
      });
    };
    map.on("load", () => {
      onMapLoad(map, opts, refresh);
    });
  }
  return () => {
    opts.overlayRef.current?.remove();
    opts.overlayRef.current = null;
    opts.mapRef.current?.remove();
    opts.mapRef.current = null;
  };
}

function motionOptions(): maplibregl.AnimationOptions {
  if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { animate: false };
  }
  return { duration: 400, easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t) };
}

function onMapLoad(map: maplibregl.Map, opts: InitOpts, refresh: () => void) {
  addZoneLayers(map, `/api/mvt/${TILE_VERSION}/{z}/{x}/{y}?outbreak_id=${opts.outbreakId}`);
  registerZoneInteractions(map, () => opts.live.current.onSelectZone);
  if (opts.live.current.terrain) {
    addTerrain(map);
  }
  if (opts.live.current.sentinel) {
    addSentinel(map);
  }
  void attachOverlayAndRefresh(map, opts, refresh);
  refresh();
  // Re-apply feature-state / rebuild the case overlay only when the tile source finishes
  // loading (covers initial load + pan/zoom into new tiles) — not on every `idle`, which
  // fires far more often and would rebuild the deck layer redundantly.
  map.on("sourcedata", (e) => {
    if (e.sourceId === MVT_SOURCE && e.isSourceLoaded) {
      refresh();
    }
  });
}

function refreshMap(map: maplibregl.Map, ctx: RefreshCtx) {
  const { live, overlayRef, loadedZonesRef } = ctx;
  const zones = getLoadedZones(map);
  loadedZonesRef.current = zones;
  applyZoneFeatureStates(
    map,
    live.caseCountsByCode,
    zones.map((z) => z.code),
  );
  if (live.activeLayers !== undefined) {
    setZoneVisibility(map, live.activeLayers);
  }
  setSelectedZone(map, live.selected?.code ?? null);
  const points = casePointsFromFeatures(
    map.querySourceFeatures(MVT_SOURCE, { sourceLayer: "cases" }),
    "deaths",
  );
  overlayRef.current?.update(points, live.activeLayers?.has("deaths") ?? true);
}

function syncLayerVisibility(
  map: maplibregl.Map | null,
  overlayRef: RefObject<CaseOverlayHandle | null>,
  activeLayers: Set<string> | undefined,
) {
  if (map?.isStyleLoaded() !== true || activeLayers === undefined) {
    return;
  }
  setZoneVisibility(map, activeLayers);
  const points = casePointsFromFeatures(
    map.querySourceFeatures(MVT_SOURCE, { sourceLayer: "cases" }),
    "deaths",
  );
  overlayRef.current?.update(points, activeLayers.has("deaths"));
}

function toggleSentinel(map: maplibregl.Map | null, sentinel: boolean) {
  if (map?.isStyleLoaded() !== true) {
    return;
  }
  if (sentinel) {
    addSentinel(map);
  } else if (map.getLayer("sentinel-2-layer") !== undefined) {
    map.removeLayer("sentinel-2-layer");
  }
}

function toggleTerrain(map: maplibregl.Map | null, terrain: boolean) {
  if (map?.isStyleLoaded() !== true) {
    return;
  }
  if (terrain) {
    addTerrain(map);
  } else {
    map.setTerrain(null);
  }
}

/** Latest-value ref: updated in an effect (never during render) so async map handlers
 *  always read current props without re-initialising the map. */
function useLiveRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Bridge the shared keyboard bus to map actions. Refs are read live so the latest props apply
 *  without re-subscribing. Bundled into one options object to stay within the param limit. */
function useMapKeyboard(opts: {
  keyboard: MapKeyboard;
  live: RefObject<LiveProps>;
  loadedZonesRef: RefObject<LoadedZone[]>;
  mapRef: RefObject<maplibregl.Map | null>;
}) {
  const { keyboard, live, loadedZonesRef, mapRef } = opts;
  useEffect(
    () =>
      keyboard.subscribe((ev) => {
        const map = mapRef.current;
        if (map !== null) {
          dispatchMapKey(map, ev, {
            zones: loadedZonesRef.current,
            currentCode: live.current.selected?.code ?? null,
            onSelect: live.current.onSelectZone,
          });
        }
      }),
    [keyboard, live, loadedZonesRef, mapRef],
  );
}
