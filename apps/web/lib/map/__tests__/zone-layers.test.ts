import { describe, expect, it, vi } from "vitest";

import {
  addZoneLayers,
  applyZoneFeatureStates,
  createHatchImage,
  cycleZone,
  getLoadedZones,
  registerZoneInteractions,
  setSelectedZone,
  setZoneVisibility,
} from "../zone-layers";

interface MockMap {
  getLayer: ReturnType<typeof vi.fn>;
  querySourceFeatures: ReturnType<typeof vi.fn>;
  removeFeatureState: ReturnType<typeof vi.fn>;
  setFeatureState: ReturnType<typeof vi.fn>;
  setFilter: ReturnType<typeof vi.fn>;
  setLayoutProperty: ReturnType<typeof vi.fn>;
}

function mockMap(): MockMap {
  return {
    setFeatureState: vi.fn(),
    removeFeatureState: vi.fn(),
    setFilter: vi.fn(),
    setLayoutProperty: vi.fn(),
    getLayer: vi.fn().mockReturnValue({}),
    querySourceFeatures: vi.fn().mockReturnValue([]),
  };
}

describe("addZoneLayers", () => {
  it("adds the MVT source with promoteId and the four zone layers", () => {
    const addSource = vi.fn();
    const addLayer = vi.fn();
    const map = {
      addSource,
      addLayer,
      addImage: vi.fn(),
      hasImage: vi.fn().mockReturnValue(false),
    };
    addZoneLayers(map as never, "/api/mvt/zones_v1/{z}/{x}/{y}?outbreak_id=o1");
    expect(addSource).toHaveBeenCalledWith(
      "mvt-zones",
      expect.objectContaining({ promoteId: { zones: "code" } }),
    );
    const layerIds = addLayer.mock.calls.map((c) => (c[0] as { id: string }).id);
    expect(layerIds).toEqual([
      "zones-hatch",
      "zones-fill",
      "zones-line",
      "selected-zone-casing",
      "selected-zone",
    ]);
  });
});

describe("registerZoneInteractions", () => {
  it("invokes onSelect with the clicked zone's code and name", () => {
    let clickHandler: ((e: unknown) => void) | undefined;
    const map = {
      on: vi.fn((event: string, _layer: string, cb: (e: unknown) => void) => {
        if (event === "click") {
          clickHandler = cb;
        }
      }),
      getCanvas: () => ({ style: {} }),
    };
    const onSelect = vi.fn();
    registerZoneInteractions(map as never, () => onSelect);
    clickHandler?.({ features: [{ properties: { code: "COD-IT-BU", name: "Bunia" } }] });
    expect(onSelect).toHaveBeenCalledWith({ code: "COD-IT-BU", name: "Bunia" });
  });

  it("falls back to the code when name is missing and ignores non-string codes", () => {
    let clickHandler: ((e: unknown) => void) | undefined;
    const map = {
      on: vi.fn((event: string, _layer: string, cb: (e: unknown) => void) => {
        if (event === "click") {
          clickHandler = cb;
        }
      }),
      getCanvas: () => ({ style: {} }),
    };
    const onSelect = vi.fn();
    registerZoneInteractions(map as never, () => onSelect);
    clickHandler?.({ features: [{ properties: { code: "COD-IT-DJ" } }] });
    expect(onSelect).toHaveBeenCalledWith({ code: "COD-IT-DJ", name: "COD-IT-DJ" });
    clickHandler?.({ features: [{ properties: { code: 42 } }] });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("applyZoneFeatureStates", () => {
  it("sets caseCount + hasData keyed by zone code (feature id)", () => {
    const map = mockMap();
    applyZoneFeatureStates(map as never, { "COD-IT-BU": 50, "COD-IT-DJ": 0 }, []);
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: "mvt-zones", sourceLayer: "zones", id: "COD-IT-BU" },
      { caseCount: 50, hasData: true },
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: "mvt-zones", sourceLayer: "zones", id: "COD-IT-DJ" },
      { caseCount: 0, hasData: true },
    );
  });

  it("clears feature-state for loaded zones absent from the new counts (scrub-back)", () => {
    const map = mockMap();
    // COD-IT-MB was coloured before; the scrubbed-back counts no longer include it → must reset
    // so the no-data hatch shows instead of a stale (future) colour. A genuine 0 is NOT cleared.
    applyZoneFeatureStates(map as never, { "COD-IT-BU": 50, "COD-IT-DJ": 0 }, [
      "COD-IT-BU",
      "COD-IT-DJ",
      "COD-IT-MB",
    ]);
    expect(map.removeFeatureState).toHaveBeenCalledWith({
      source: "mvt-zones",
      sourceLayer: "zones",
      id: "COD-IT-MB",
    });
    expect(map.removeFeatureState).toHaveBeenCalledTimes(1);
  });
});

describe("setSelectedZone", () => {
  it("filters the focus-ring layer to the selected code", () => {
    const map = mockMap();
    setSelectedZone(map as never, "COD-IT-BU");
    expect(map.setFilter).toHaveBeenCalledWith("selected-zone", [
      "==",
      ["get", "code"],
      "COD-IT-BU",
    ]);
  });

  it("filters to a sentinel non-match when nothing is selected", () => {
    const map = mockMap();
    setSelectedZone(map as never, null);
    expect(map.setFilter).toHaveBeenCalledWith("selected-zone", [
      "==",
      ["get", "code"],
      "__none__",
    ]);
  });
});

describe("setZoneVisibility", () => {
  it("hides the choropleth when 'confirmed' is not active", () => {
    const map = mockMap();
    setZoneVisibility(map as never, new Set(["admin2"]));
    expect(map.setLayoutProperty).toHaveBeenCalledWith("zones-fill", "visibility", "none");
    expect(map.setLayoutProperty).toHaveBeenCalledWith("zones-line", "visibility", "visible");
  });
});

describe("getLoadedZones", () => {
  it("dedupes by code and sorts", () => {
    const map = mockMap();
    map.querySourceFeatures.mockReturnValue([
      { properties: { code: "COD-IT-DJ", name: "Djugu" } },
      { properties: { code: "COD-IT-BU", name: "Bunia" } },
      { properties: { code: "COD-IT-BU", name: "Bunia" } },
    ]);
    const zones = getLoadedZones(map as never);
    expect(zones).toEqual([
      { code: "COD-IT-BU", name: "Bunia" },
      { code: "COD-IT-DJ", name: "Djugu" },
    ]);
  });
});

describe("cycleZone", () => {
  const zones = [
    { code: "A", name: "A" },
    { code: "B", name: "B" },
    { code: "C", name: "C" },
  ];

  it("advances forward and wraps", () => {
    expect(cycleZone(zones, "A", "next")?.code).toBe("B");
    expect(cycleZone(zones, "C", "next")?.code).toBe("A");
  });

  it("advances backward and wraps", () => {
    expect(cycleZone(zones, "B", "prev")?.code).toBe("A");
    expect(cycleZone(zones, "A", "prev")?.code).toBe("C");
  });

  it("starts at the first zone when nothing is selected", () => {
    expect(cycleZone(zones, null, "next")?.code).toBe("A");
  });

  it("returns null for an empty list", () => {
    expect(cycleZone([], null, "next")).toBeNull();
  });
});

describe("createHatchImage", () => {
  it("returns an RGBA buffer with both opaque and transparent pixels", () => {
    const img = createHatchImage(16);
    expect(img.width).toBe(16);
    expect(img.data.length).toBe(16 * 16 * 4);
    const alphas: number[] = [];
    for (let i = 3; i < img.data.length; i += 4) {
      alphas.push(img.data[i] ?? 0);
    }
    expect(alphas.includes(0)).toBe(true);
    expect(alphas.some((a) => a > 0)).toBe(true);
  });
});
