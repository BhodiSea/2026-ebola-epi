import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SourceQuoteCard } from "../source-quote-card";
import type { SerializedQuote } from "../types";

const RE_QUOTE = /127 confirmed/;

const MOCK_QUOTE: SerializedQuote = {
  id: "00000000-0000-0000-0000-000000000001",
  quoteText: "127 confirmed cases as of 15 March 2026.",
  charStart: 0,
  charEnd: 40,
  sourceName: "WHO DON",
  sourceSlug: "who-don",
  documentUrl: null,
  publishedAt: null,
  licenseTier: "open",
  createdAt: "2026-03-16T00:00:00Z",
};

describe("SourceQuoteCard", () => {
  it("renders the trigger children", () => {
    render(
      <SourceQuoteCard quote={MOCK_QUOTE}>
        <button type="button">127</button>
      </SourceQuoteCard>,
    );
    expect(screen.getByText("127")).toBeInTheDocument();
  });

  // waitFor polls past openDelay=80ms without fake-timer deadlock
  it("shows quote content after hover past openDelay", async () => {
    const user = userEvent.setup();

    render(
      <SourceQuoteCard quote={MOCK_QUOTE}>
        <button type="button">127</button>
      </SourceQuoteCard>,
    );

    await user.hover(screen.getByText("127"));

    await waitFor(() => expect(screen.getByText(RE_QUOTE)).toBeInTheDocument(), {
      timeout: 500,
    });
  });
});
