import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OutbreakChoropleth } from "../choropleth-stub";
import type { ChoroplethData } from "@/lib/queries/choropleth";
import { getOutbreakZoneSvg } from "@/lib/queries/choropleth";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/choropleth");
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const MOCK_DATA: ChoroplethData = {
  zones: [
    {
      admin2Code: "COD-IT-IR",
      name: "Irumu",
      svgPath: "M 0,0 L 10,0 L 10,-10 Z",
      totalValue: 98,
      bbox: { xmin: 29, xmax: 30, ymin: 1, ymax: 2 },
    },
    {
      admin2Code: "COD-IT-MB",
      name: "Mambasa",
      svgPath: "M 10,0 L 20,0 L 20,-10 Z",
      totalValue: 45,
      bbox: { xmin: 27.5, xmax: 28.5, ymin: 1, ymax: 2 },
    },
    {
      admin2Code: "COD-IT-BU",
      name: "Bunia",
      svgPath: "M 20,0 L 30,0 L 30,-10 Z",
      totalValue: 23,
      bbox: { xmin: 30, xmax: 31, ymin: 1.3, ymax: 2 },
    },
    {
      admin2Code: "COD-IT-KO",
      name: "Komanda",
      svgPath: "M 30,0 L 40,0 L 40,-10 Z",
      totalValue: 15,
      bbox: { xmin: 29.5, xmax: 30.5, ymin: 0.5, ymax: 1.5 },
    },
    {
      admin2Code: "COD-IT-MA",
      name: "Mahagi",
      svgPath: "M 40,0 L 50,0 L 50,-10 Z",
      totalValue: 8,
      bbox: { xmin: 30.5, xmax: 31.5, ymin: 2, ymax: 3 },
    },
  ],
  globalBbox: { xmin: 27.5, xmax: 31.5, ymin: 0.5, ymax: 3 },
};

const OUTBREAK_ID = "d0eebc99-0000-0000-0000-000000000001";

describe("OutbreakChoropleth", () => {
  it("renders data-outbreak-choropleth attribute", async () => {
    vi.mocked(getOutbreakZoneSvg).mockResolvedValue(MOCK_DATA);
    const jsx = await OutbreakChoropleth({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    expect(container.querySelector("[data-outbreak-choropleth]")).not.toBeNull();
  });

  it("renders SVG with path elements for map view", async () => {
    vi.mocked(getOutbreakZoneSvg).mockResolvedValue(MOCK_DATA);
    const jsx = await OutbreakChoropleth({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    const paths = container.querySelectorAll("svg path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("renders a table when viewMode=table", async () => {
    vi.mocked(getOutbreakZoneSvg).mockResolvedValue(MOCK_DATA);
    const jsx = await OutbreakChoropleth({ outbreakId: OUTBREAK_ID, viewMode: "table" });
    const { container } = render(jsx);
    expect(container.querySelector("table")).not.toBeNull();
  });

  it("renders zone names in table view", async () => {
    vi.mocked(getOutbreakZoneSvg).mockResolvedValue(MOCK_DATA);
    const jsx = await OutbreakChoropleth({ outbreakId: OUTBREAK_ID, viewMode: "table" });
    const { getByText } = render(jsx);
    expect(getByText("Irumu")).toBeInTheDocument();
    expect(getByText("Mambasa")).toBeInTheDocument();
  });

  it("renders empty state when no data returned", async () => {
    vi.mocked(getOutbreakZoneSvg).mockResolvedValue(null);
    const jsx = await OutbreakChoropleth({ outbreakId: OUTBREAK_ID });
    const { container } = render(jsx);
    expect(container.querySelector("[data-outbreak-choropleth]")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });
});
