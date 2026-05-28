import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CitationCopier } from "../citation-copier";
import type { SerializedQuote } from "../types";

const RE_PLAIN = /plain/i;
const RE_BIBTEX = /bibtex/i;
const RE_APA = /apa/i;
const RE_COPY = /Copy/;
const RE_WHO_DON = /WHO DON/;
const RE_NO_ELLIPSIS_QUOTE = /…"/;

const MOCK_QUOTE: SerializedQuote = {
  id: "00000000-0000-0000-0000-000000000001",
  quoteText: "127 confirmed cases as of 15 March 2026.",
  charStart: 0,
  charEnd: 40,
  sourceName: "WHO DON",
  sourceSlug: "who-don",
  documentUrl: "https://example.com/report.pdf",
  publishedAt: "2026-03-15T00:00:00Z",
  licenseTier: "open",
  createdAt: "2026-03-16T00:00:00Z",
};

describe("CitationCopier", () => {
  it("renders all three citation tab buttons", () => {
    render(<CitationCopier quote={MOCK_QUOTE} />);
    expect(screen.getByText(RE_PLAIN)).toBeInTheDocument();
    expect(screen.getByText(RE_BIBTEX)).toBeInTheDocument();
    expect(screen.getByText(RE_APA)).toBeInTheDocument();
  });

  it("renders the copy button", () => {
    render(<CitationCopier quote={MOCK_QUOTE} />);
    expect(screen.getByText(RE_COPY)).toBeInTheDocument();
  });

  it("renders source name in default plain citation", () => {
    render(<CitationCopier quote={MOCK_QUOTE} />);
    expect(screen.getByText(RE_WHO_DON)).toBeInTheDocument();
  });

  it("does not append ellipsis when quote is 80 chars or fewer", () => {
    render(<CitationCopier quote={MOCK_QUOTE} />);
    // quoteText is 40 chars — plain citation must not end with "…"
    const pre = document.querySelector("pre");
    expect(pre?.textContent).not.toMatch(RE_NO_ELLIPSIS_QUOTE);
  });
});
