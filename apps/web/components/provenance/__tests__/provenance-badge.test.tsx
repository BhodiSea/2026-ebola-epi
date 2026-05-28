import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProvenanceBadge } from "../provenance-badge";

const RE_TIER1_DOT = /bg-red-5/;
const RE_TIER2_DOT = /bg-red-3/;
const RE_TIER3_DOT = /bg-fg-subtle/;
const RE_MAY = /May/;

describe("ProvenanceBadge", () => {
  it("renders the source name", () => {
    render(<ProvenanceBadge sourceName="WHO DON" tier="tier-1" />);
    expect(screen.getByText("WHO DON")).toBeInTheDocument();
  });

  it("renders tier-1 dot class", () => {
    const { container } = render(<ProvenanceBadge sourceName="WHO DON" tier="tier-1" />);
    const dot = container.querySelector("[aria-hidden]");
    expect(dot?.className).toMatch(RE_TIER1_DOT);
  });

  it("renders tier-2 dot class", () => {
    const { container } = render(<ProvenanceBadge sourceName="ACLED" tier="tier-2" />);
    const dot = container.querySelector("[aria-hidden]");
    expect(dot?.className).toMatch(RE_TIER2_DOT);
  });

  it("renders tier-3 dot class", () => {
    const { container } = render(<ProvenanceBadge sourceName="ReliefWeb" tier="tier-3" />);
    const dot = container.querySelector("[aria-hidden]");
    expect(dot?.className).toMatch(RE_TIER3_DOT);
  });

  it("renders publishedAt when provided", () => {
    render(
      <ProvenanceBadge sourceName="WHO DON" tier="tier-1" publishedAt="2026-05-01T00:00:00Z" />,
    );
    expect(screen.getByText(RE_MAY)).toBeInTheDocument();
  });

  it("omits date when publishedAt is null", () => {
    const { container } = render(
      <ProvenanceBadge sourceName="WHO DON" tier="tier-1" publishedAt={null} />,
    );
    expect(container.querySelectorAll("span").length).toBe(2);
  });
});
