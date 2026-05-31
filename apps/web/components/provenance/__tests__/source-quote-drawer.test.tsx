import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SourceQuoteDrawer } from "../source-quote-drawer";
import type { SerializedQuote } from "../types";

vi.mock("@/components/provenance/citation-copier", () => ({
  CitationCopier: () => null,
}));
vi.mock("@/components/provenance/provenance-badge", () => ({
  ProvenanceBadge: () => null,
  toTier: vi.fn(() => "open"),
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const QUOTE: SerializedQuote = {
  id: "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
  quoteText: "127 confirmed cases as of 15 March 2026.",
  charStart: 0,
  charEnd: 40,
  sourceName: "WHO DON",
  sourceSlug: "who-don",
  documentUrl: null,
  publishedAt: "2026-03-15T00:00:00Z",
  licenseTier: "open",
  createdAt: "2026-03-16T00:00:00Z",
};

const RE_REVIEWED = /reviewed/i;
const RE_ANOMALY = /anomaly/i;
const RE_CONFIDENCE = /confidence/i;

describe("SourceQuoteDrawer with custody prop", () => {
  it("renders em-dash for custody fields when custody is null", () => {
    const { getAllByText } = render(
      <SourceQuoteDrawer quote={QUOTE} open={true} onOpenChange={vi.fn()} custody={null} />,
    );
    expect(getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renders real reviewedAt when custody is provided", () => {
    render(
      <SourceQuoteDrawer
        quote={QUOTE}
        open={true}
        onOpenChange={vi.fn()}
        custody={{ reviewedAt: "2026-05-24T13:05:00Z", anomalyOpen: false, confidence: 1 }}
      />,
    );
    expect(screen.getByText(RE_REVIEWED)).toBeInTheDocument();
    expect(screen.getByText(RE_ANOMALY)).toBeInTheDocument();
    expect(screen.getByText(RE_CONFIDENCE)).toBeInTheDocument();
  });
});
