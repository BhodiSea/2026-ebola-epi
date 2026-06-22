import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatCard } from "../stat-card";

vi.mock("server-only", () => ({}));
vi.mock("@/components/provenance/figure-or-missing", () => ({
  FigureOrMissing: ({ value }: { quoteId: null | string; value: number | string }) => (
    <span data-figure>{value}</span>
  ),
}));
vi.mock("@/components/outbreak/disagreement-pill", () => ({
  DisagreementPill: ({ count }: { count: number }) => (
    <button type="button" data-disagreement-pill>
      +{count} disagreement
    </button>
  ),
}));

const QUOTE_ID = "00000000-0000-0000-0000-000000000001";

describe("StatCard", () => {
  it("renders data-stat-card attribute", () => {
    const { container } = render(StatCard({ label: "Confirmed", value: 189, quoteId: QUOTE_ID }));
    expect(container.querySelector("[data-stat-card]")).not.toBeNull();
  });

  it("sets data-stat-card to lowercased label", () => {
    const { container } = render(StatCard({ label: "Confirmed", value: 189, quoteId: QUOTE_ID }));
    expect(container.querySelector('[data-stat-card="confirmed"]')).not.toBeNull();
  });

  it("renders value inside Figure (data-figure present)", () => {
    const { container } = render(StatCard({ label: "Confirmed", value: 189, quoteId: QUOTE_ID }));
    expect(container.querySelector("[data-figure]")).not.toBeNull();
    expect(screen.getByText("189")).toBeInTheDocument();
  });

  it("renders label text", () => {
    render(StatCard({ label: "Confirmed", value: 189, quoteId: QUOTE_ID }));
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("renders sparkline svg path when sparkline prop supplied", () => {
    const { container } = render(
      StatCard({
        label: "Confirmed",
        value: 189,
        quoteId: QUOTE_ID,
        sparkline: [10, 20, 30, 40, 50, 60, 70, 80],
      }),
    );
    expect(container.querySelector("svg path")).not.toBeNull();
  });

  it("does not render sparkline svg when prop is absent", () => {
    const { container } = render(StatCard({ label: "Confirmed", value: 189, quoteId: QUOTE_ID }));
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders deltaPct when provided", () => {
    render(
      StatCard({
        label: "Deaths",
        value: 37,
        quoteId: QUOTE_ID,
        deltaPct: -5.2,
      }),
    );
    expect(screen.getByText("-5.2%")).toBeInTheDocument();
  });

  it("renders disagreement pill when disagreements prop is non-empty", () => {
    const { container } = render(
      StatCard({
        label: "Confirmed",
        value: 142,
        quoteId: QUOTE_ID,
        disagreements: [
          {
            rowId: "aaa",
            value: 142,
            sourceSlug: "who-don",
            quoteId: QUOTE_ID,
            superseded: false,
            trustScore: 0.95,
          },
          {
            rowId: "bbb",
            value: 108,
            sourceSlug: "ecdc-cdtr",
            quoteId: null,
            superseded: true,
            trustScore: 0.8,
          },
        ],
      }),
    );
    expect(container.querySelector("[data-disagreement-pill]")).not.toBeNull();
  });

  it("does not render disagreement pill when disagreements prop is absent", () => {
    const { container } = render(StatCard({ label: "Confirmed", value: 142, quoteId: QUOTE_ID }));
    expect(container.querySelector("[data-disagreement-pill]")).toBeNull();
  });

  it("does not render disagreement pill when disagreements array is empty", () => {
    const { container } = render(
      StatCard({ label: "Confirmed", value: 142, quoteId: QUOTE_ID, disagreements: [] }),
    );
    expect(container.querySelector("[data-disagreement-pill]")).toBeNull();
  });
});
