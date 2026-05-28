import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FigureInteractive } from "../figure-interactive";
import type { SerializedQuote } from "../types";

const RE_SOURCE = /Source:/;
const RE_BORDER_DOTTED = /border-dotted/;

const MOCK_QUOTE: SerializedQuote = {
  id: "00000000-0000-0000-0000-000000000001",
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

describe("FigureInteractive", () => {
  it("renders the figure value", () => {
    render(
      <FigureInteractive value={127} quote={MOCK_QUOTE} description="Source: WHO DON, Mar 2026." />,
    );
    expect(screen.getByText("127")).toBeInTheDocument();
  });

  it("has data-figure attribute on the trigger", () => {
    const { container } = render(
      <FigureInteractive value={127} quote={MOCK_QUOTE} description="Source: WHO DON, Mar 2026." />,
    );
    expect(container.querySelector("[data-figure]")).not.toBeNull();
  });

  it("has a hidden span with 'Source:' for aria-describedby", () => {
    render(
      <FigureInteractive value={127} quote={MOCK_QUOTE} description="Source: WHO DON, Mar 2026." />,
    );
    expect(screen.getByText(RE_SOURCE)).toBeInTheDocument();
  });

  it("applies dotted-underline class on the trigger", () => {
    const { container } = render(
      <FigureInteractive value={127} quote={MOCK_QUOTE} description="Source: WHO DON, Mar 2026." />,
    );
    const trigger = container.querySelector("[data-figure]");
    expect(trigger?.className).toMatch(RE_BORDER_DOTTED);
  });
});
