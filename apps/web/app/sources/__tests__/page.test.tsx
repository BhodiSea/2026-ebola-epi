import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SourcesPage from "../page";
import { listSources } from "@/lib/queries/sources";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/sources", () => ({ listSources: vi.fn() }));
vi.mock("@/components/sources/source-library-table", () => ({
  SourceLibraryTable: ({ sources }: { sources: { id: string; name: string }[] }) => (
    <div data-source-library-table>
      {sources.map((s) => (
        <div key={s.id} data-source-row>
          {s.name}
        </div>
      ))}
    </div>
  ),
}));

const MOCK_SOURCE = {
  id: "src-001",
  slug: "who-don",
  name: "WHO DON",
  url: "https://who.int/don",
  trustScore: 0.95,
  licenseTier: "open" as const,
  licenseUrl: null,
  attributionRequired: true,
  metadata: {},
  createdAt: "2026-01-01T00:00:00Z",
  lastFetch: "2026-05-28T00:00:00Z",
  docCount: 12,
};

const HEADING_RE = /Sources/i;

describe("SourcesPage", () => {
  it("renders the source library table", async () => {
    vi.mocked(listSources).mockResolvedValue([MOCK_SOURCE]);
    const jsx = await SourcesPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-source-library-table]")).not.toBeNull();
  });

  it("passes sources to the table", async () => {
    vi.mocked(listSources).mockResolvedValue([MOCK_SOURCE]);
    const jsx = await SourcesPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText("WHO DON")).toBeInTheDocument();
  });

  it("renders page heading", async () => {
    vi.mocked(listSources).mockResolvedValue([]);
    const jsx = await SourcesPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByRole("heading", { name: HEADING_RE })).toBeInTheDocument();
  });
});
