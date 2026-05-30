import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapPane } from "../map-pane";
import { createMapKeyboard } from "@/lib/map/keyboard";

const h = vi.hoisted(() => {
  const handlers: Record<string, ((arg?: unknown) => void)[]> = {};
  const setFeatureState = vi.fn();
  const addSource = vi.fn();
  const map = {
    addControl: vi.fn(),
    removeControl: vi.fn(),
    addSource,
    addLayer: vi.fn(),
    addImage: vi.fn(),
    removeLayer: vi.fn(),
    hasImage: () => false,
    getLayer: vi.fn(),
    getSource: vi.fn(),
    querySourceFeatures: () => [],
    setFeatureState,
    setFilter: vi.fn(),
    setLayoutProperty: vi.fn(),
    setTerrain: vi.fn(),
    isStyleLoaded: () => true,
    getCanvas: () => ({ style: {}, clientWidth: 800, clientHeight: 600 }),
    on: (event: string, a: unknown, b?: unknown) => {
      const cb = typeof a === "function" ? a : b;
      if (typeof cb === "function") {
        const list = handlers[event] ?? [];
        list.push(cb as (arg?: unknown) => void);
        handlers[event] = list;
      }
    },
    remove: vi.fn(),
  };
  return { handlers, setFeatureState, addSource, map };
});

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(() => h.map),
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
  },
}));
vi.mock("@deck.gl/mapbox", () => ({
  MapboxOverlay: vi.fn(() => ({ setProps: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn() })),
}));
vi.mock("@deck.gl/layers", () => ({ ScatterplotLayer: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(h.handlers)) {
    h.handlers[k] = [];
  }
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

function fireLoad() {
  for (const cb of h.handlers.load ?? []) {
    cb();
  }
}

// Covers initMap → onMapLoad → attachOverlayAndRefresh wiring (overlay disposed if the map is
// torn down mid-attach is exercised via the mapRef-identity check, not a separate timing test).
describe("MapPane choropleth feature-state", () => {
  it("registers the vector source with promoteId on the zones layer", () => {
    act(() => {
      render(
        <MapPane
          outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
          keyboard={createMapKeyboard()}
          caseCountsByCode={{ "COD-IT-BU": 50 }}
          ariaLabel="Test map"
        />,
      );
    });
    act(() => {
      fireLoad();
    });
    const sourceCall = h.addSource.mock.calls.find((c) => c[0] === "mvt-zones");
    expect(sourceCall?.[1]).toMatchObject({ promoteId: { zones: "code" } });
  });

  it("applies setFeatureState keyed by zone code after load", () => {
    act(() => {
      render(
        <MapPane
          outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
          keyboard={createMapKeyboard()}
          caseCountsByCode={{ "COD-IT-BU": 50 }}
          ariaLabel="Test map"
        />,
      );
    });
    act(() => {
      fireLoad();
    });
    expect(h.setFeatureState).toHaveBeenCalledWith(
      { source: "mvt-zones", sourceLayer: "zones", id: "COD-IT-BU" },
      { caseCount: 50, hasData: true },
    );
  });

  it("re-applies feature-state when the mvt source finishes loading", () => {
    act(() => {
      render(
        <MapPane
          outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
          keyboard={createMapKeyboard()}
          caseCountsByCode={{ "COD-IT-DJ": 12 }}
          ariaLabel="Test map"
        />,
      );
    });
    act(() => {
      fireLoad();
    });
    const before = h.setFeatureState.mock.calls.length;
    act(() => {
      for (const cb of h.handlers.sourcedata ?? []) {
        cb({ sourceId: "mvt-zones", isSourceLoaded: true });
      }
    });
    expect(h.setFeatureState.mock.calls.length).toBeGreaterThan(before);
  });
});
