import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavior contract for the layer-rail ESLint refactor (focus-cycle hook + LayerGroups).
import { LayerRail } from "../layer-rail";
import { createMapKeyboard } from "@/lib/map/keyboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const TERRAIN_RE = /terrain/i;
const CASES_RE = /confirmed cases/i;
const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

describe("LayerRail", () => {
  it("renders with data-layer-rail attribute", () => {
    const { container } = render(
      <LayerRail outbreakId={OUTBREAK_ID} keyboard={createMapKeyboard()} />,
    );
    expect(container.querySelector("[data-layer-rail]")).not.toBeNull();
  });

  it("renders terrain toggle checkbox off by default", () => {
    render(<LayerRail outbreakId={OUTBREAK_ID} keyboard={createMapKeyboard()} />);
    const terrain = screen.getByRole("checkbox", { name: TERRAIN_RE });
    expect(terrain).toHaveAttribute("aria-checked", "false");
  });

  it("renders cases layer checkbox", () => {
    render(<LayerRail outbreakId={OUTBREAK_ID} keyboard={createMapKeyboard()} />);
    expect(screen.getByRole("checkbox", { name: CASES_RE })).toBeInTheDocument();
  });

  it("moves DOM focus to a layer checkbox when keyboard emits cycleLayer", () => {
    const keyboard = createMapKeyboard();
    render(<LayerRail outbreakId={OUTBREAK_ID} keyboard={keyboard} />);
    act(() => {
      keyboard.emit({ type: "cycleLayer" });
    });
    expect(document.activeElement?.getAttribute("data-layer-label")).toBe("");
  });
});
