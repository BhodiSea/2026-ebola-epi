import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Behavior contract for the inspector-tabs ESLint refactor (custom hook extraction).
import { InspectorTabs } from "../inspector-tabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/outbreak/timeline-multi", () => ({
  TimelineMulti: () => <div data-testid="timeline-multi" />,
}));

vi.mock("@/components/provenance/severity-pill", () => ({
  SeverityPill: ({ level }: { level: string }) => <span data-testid="severity-pill">{level}</span>,
}));

const EMPTY_STATE_RE = /click a region to inspect/i;
const OVERVIEW_RE = /overview/i;
const TIMELINE_RE = /timeline/i;
const SOURCES_RE = /sources/i;
const RAW_RE = /raw/i;

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi
      .fn()
      .mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});

describe("InspectorTabs", () => {
  it("renders with data-inspector-tabs attribute", () => {
    const { container } = render(
      <InspectorTabs outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />,
    );
    expect(container.querySelector("[data-inspector-tabs]")).not.toBeNull();
  });

  it("shows empty state when no region is selected", () => {
    render(<InspectorTabs outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />);
    expect(screen.getByText(EMPTY_STATE_RE)).toBeInTheDocument();
  });

  it("renders four tab buttons", () => {
    render(<InspectorTabs outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />);
    expect(screen.getByRole("tab", { name: OVERVIEW_RE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: TIMELINE_RE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: SOURCES_RE })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: RAW_RE })).toBeInTheDocument();
  });

  it("Overview tab is active by default", () => {
    render(<InspectorTabs outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />);
    const overview = screen.getByRole("tab", { name: OVERVIEW_RE });
    expect(overview).toHaveAttribute("aria-selected", "true");
  });

  it("fetches per-zone detail and populates the Overview when a region is selected", async () => {
    const zoneResponse = {
      code: "COD-IT-BU",
      totals: {
        confirmed: { value: 50, quote: null, description: null },
        deaths: { value: 5, quote: null, description: null },
        cfr: 10,
        firstDetected: { value: "2026-05-01", quote: null, description: null },
      },
      series: { confirmed: [], deaths: [] },
      documents: [],
      rawRows: [],
      sourceCount: 1,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(zoneResponse) }),
    );

    render(
      <InspectorTabs
        outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"
        selectedAdmin1={{ code: "COD-IT-BU", name: "Bunia" }}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Bunia" })).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByTestId("severity-pill")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/zone/COD-IT-BU"),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect.anything() returns an any-typed internal matcher
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
