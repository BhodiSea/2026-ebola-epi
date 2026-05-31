import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterChipsInteractive } from "../filter-chips-interactive";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

const PATHOGENS = [
  { pathogenSlug: "bundibugyo-virus", pathogenIcd11: "1D60.00" },
  { pathogenSlug: "ebola-zaire", pathogenIcd11: "1D60.10" },
];

describe("FilterChipsInteractive", () => {
  it("renders an option for each pathogen from props", () => {
    const { container } = render(
      FilterChipsInteractive({ pathogens: PATHOGENS, currentPathogen: "", currentStatus: "" }),
    );
    const options = container.querySelectorAll("option");
    // +1 for the "All pathogens" default option
    expect(options.length).toBeGreaterThanOrEqual(PATHOGENS.length + 1);
  });

  it("renders pathogen slugs as option values", () => {
    render(
      FilterChipsInteractive({ pathogens: PATHOGENS, currentPathogen: "", currentStatus: "" }),
    );
    expect(screen.getByRole("option", { name: "bundibugyo-virus" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ebola-zaire" })).toBeInTheDocument();
  });

  it("does not render hardcoded pathogen options", () => {
    render(FilterChipsInteractive({ pathogens: [], currentPathogen: "", currentStatus: "" }));
    expect(screen.queryByRole("option", { name: "Bundibugyo virus" })).toBeNull();
  });
});
