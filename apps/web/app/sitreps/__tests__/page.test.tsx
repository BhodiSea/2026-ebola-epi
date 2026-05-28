import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SitrepPage from "../page";
import { listSitreps } from "@/lib/queries/documents";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/documents", () => ({ listSitreps: vi.fn() }));

const TODAY = "2026-05-28";

const MOCK_DOC = {
  id: "d0eebc99-0000-0000-0000-000000000001",
  title: "Bundibugyo virus disease — Sitrep 11",
  url: "https://example.com/sitrep-11",
  publishedAt: `${TODAY}T08:00:00Z`,
  ingestedAt: `${TODAY}T09:00:00Z`,
  source: {
    id: "src-001",
    slug: "who-afro",
    name: "WHO AFRO",
    trustScore: "0.9",
    licenseTier: "open",
  },
};

const YESTERDAY_DOC = {
  ...MOCK_DOC,
  id: "d0eebc99-0000-0000-0000-000000000002",
  publishedAt: "2026-05-27T08:00:00Z",
  ingestedAt: "2026-05-27T09:00:00Z",
};

describe("SitrepsPage", () => {
  it("renders a sitrep row for each document", async () => {
    vi.mocked(listSitreps).mockResolvedValue([MOCK_DOC]);
    const jsx = await SitrepPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelectorAll("[data-sitrep-row]").length).toBe(1);
  });

  it("renders filter chips section", async () => {
    vi.mocked(listSitreps).mockResolvedValue([MOCK_DOC]);
    const jsx = await SitrepPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelector("[data-sitrep-filters]")).not.toBeNull();
  });

  it("renders empty state when no sitreps", async () => {
    vi.mocked(listSitreps).mockResolvedValue([]);
    const jsx = await SitrepPage({ searchParams: Promise.resolve({}) });
    render(jsx);
    expect(screen.getByText(EMPTY_STATE_RE)).toBeInTheDocument();
  });

  it("groups documents by date", async () => {
    vi.mocked(listSitreps).mockResolvedValue([MOCK_DOC, YESTERDAY_DOC]);
    const jsx = await SitrepPage({ searchParams: Promise.resolve({}) });
    const { container } = render(jsx);
    expect(container.querySelectorAll("[data-date-group]").length).toBe(2);
  });
});

const EMPTY_STATE_RE = /No situation reports/;
