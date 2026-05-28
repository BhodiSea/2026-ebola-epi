import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatCard } from "../stat-card";

vi.mock("server-only", () => ({}));
vi.mock("@/components/provenance/figure", () => ({
  Figure: ({ value }: { quoteId: string; value: number | string }) => (
    <span data-figure>{value}</span>
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
});
