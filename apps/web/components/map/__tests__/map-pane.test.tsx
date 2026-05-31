import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MapPane } from "../map-pane";
import { createMapKeyboard } from "@/lib/map/keyboard";

vi.mock("maplibre-gl", () => {
  const MockMap = vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    off: vi.fn(),
    addControl: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn().mockReturnValue(null),
    getSource: vi.fn().mockReturnValue(null),
    setTerrain: vi.fn(),
    remove: vi.fn(),
    isStyleLoaded: vi.fn().mockReturnValue(false),
  }));
  return {
    default: { Map: MockMap, NavigationControl: vi.fn(), ScaleControl: vi.fn() },
    Map: MockMap,
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
  };
});

vi.mock("@deck.gl/mapbox", () => ({
  MapboxOverlay: vi.fn().mockImplementation(() => ({
    setProps: vi.fn(),
    getCanvas: vi.fn(),
  })),
}));

vi.mock("@deck.gl/layers", () => ({
  GeoJsonLayer: vi.fn(),
  ScatterplotLayer: vi.fn(),
}));

vi.mock("@deck.gl/extensions", () => ({
  TerrainExtension: vi.fn(),
}));

describe("MapPane", () => {
  it("renders a container with data-map-pane attribute", () => {
    const kb = createMapKeyboard();
    const { container } = render(
      <MapPane
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
        keyboard={kb}
        terrain={false}
        ariaLabel="Test map"
      />,
    );
    expect(container.querySelector("[data-map-pane]")).not.toBeNull();
  });

  it("renders without crashing when terrain is false", () => {
    const kb = createMapKeyboard();
    const { container } = render(
      <MapPane
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
        keyboard={kb}
        terrain={false}
        ariaLabel="Test map"
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("renders without crashing when terrain is true", () => {
    const kb = createMapKeyboard();
    const { container } = render(
      <MapPane
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
        keyboard={kb}
        terrain={true}
        ariaLabel="Test map"
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
