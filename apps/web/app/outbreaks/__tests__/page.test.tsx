import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { generateMetadata as detailGenerateMetadata } from "../[pathogen]/[country]/[onset]/page";
import OutbreaksPage from "../page";
import { getOutbreakBySlug, listOutbreaks } from "@/lib/queries/outbreaks";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/outbreaks", () => ({
  listOutbreaks: vi.fn(),
  getOutbreakBySlug: vi.fn(),
}));
vi.mock("@/components/outbreak/outbreak-row", () => ({
  OutbreakRow: ({ outbreak }: { outbreak: { id: string; name: null | string } }) => (
    <div data-outbreak-row data-id={outbreak.id}>
      {outbreak.name}
    </div>
  ),
}));
vi.mock("@/components/outbreak/filter-chips", () => ({
  FilterChips: () => <div data-filter-chips>FilterChips</div>,
}));

const EMPTY_STATE_RE = /No outbreaks match/;
const PATHOGEN_RE = /bundibugyo/i;

const MOCK_OUTBREAK = {
  id: "d0eebc99-0000-0000-0000-000000000001",
  pathogenIcd11: "1D60.00",
  pathogenSlug: "bundibugyo",
  countryIso3: "COD",
  onsetDate: "2026-04-20",
  name: "Bundibugyo virus disease — Ituri Province",
  status: "active",
  severityLevel: "emergency",
  createdAt: "2026-04-20T00:00:00Z",
};

// Coverage for OutbreaksPage (list) and OutbreakDetailPage (detail) are co-located in outbreaks/. Also covers generateMetadata title/description contracts.
describe("OutbreaksPage", () => {
  it("renders a list of outbreak rows", async () => {
    vi.mocked(listOutbreaks).mockResolvedValue([MOCK_OUTBREAK]);
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelectorAll("[data-outbreak-row]").length).toBe(1);
  });

  it("renders filter chips", async () => {
    vi.mocked(listOutbreaks).mockResolvedValue([MOCK_OUTBREAK]);
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-filter-chips]")).not.toBeNull();
  });

  it("renders empty-state when no outbreaks", async () => {
    vi.mocked(listOutbreaks).mockResolvedValue([]);
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText(EMPTY_STATE_RE)).toBeInTheDocument();
  });

  it("passes no status filter to listOutbreaks when status=all", async () => {
    vi.mocked(listOutbreaks).mockResolvedValue([]);
    await OutbreaksPage({ searchParams: Promise.resolve({ status: "all" }) });
    expect(vi.mocked(listOutbreaks)).toHaveBeenCalledWith(
      expect.not.objectContaining({ status: expect.anything() }),
    );
  });

  it("defaults to active status filter when status param is absent", async () => {
    vi.mocked(listOutbreaks).mockResolvedValue([MOCK_OUTBREAK]);
    await OutbreaksPage({ searchParams: Promise.resolve({}) });
    expect(vi.mocked(listOutbreaks)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active" }),
    );
  });
});

describe("OutbreakDetailPage generateMetadata", () => {
  it("returns a title containing the pathogen and country", async () => {
    vi.mocked(getOutbreakBySlug).mockResolvedValue(MOCK_OUTBREAK);
    const meta = await detailGenerateMetadata({
      params: Promise.resolve({ pathogen: "bundibugyo", country: "cod", onset: "2026-04-20" }),
    });
    expect(meta.title).toMatch(PATHOGEN_RE);
    expect(meta.title).toContain("ituri-sitrep");
  });

  it("returns a description", async () => {
    vi.mocked(getOutbreakBySlug).mockResolvedValue(MOCK_OUTBREAK);
    const meta = await detailGenerateMetadata({
      params: Promise.resolve({ pathogen: "bundibugyo", country: "cod", onset: "2026-04-20" }),
    });
    expect(typeof meta.description).toBe("string");
  });
});
