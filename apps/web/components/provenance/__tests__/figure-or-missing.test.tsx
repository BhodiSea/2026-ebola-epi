import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FigureOrMissing } from "../figure-or-missing";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/source-quotes", () => ({
  getSourceQuoteById: vi.fn().mockResolvedValue(null),
}));
vi.mock("../figure", () => ({
  Figure: ({ value }: { value: number | string }) => <span>{value}</span>,
}));

const RE_UNAVAILABLE = /unavailable/i;

describe("FigureOrMissing", () => {
  it("renders the value when quoteId is null", async () => {
    render(FigureOrMissing({ quoteId: null, value: 42 }));
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a 'no source' indicator when quoteId is null", async () => {
    const { container } = render(FigureOrMissing({ quoteId: null, value: 42 }));
    const el = container.querySelector("[title]");
    expect(el?.getAttribute("title")).toMatch(RE_UNAVAILABLE);
  });

  it("renders the value when quoteId is provided but row is missing", async () => {
    render(FigureOrMissing({ quoteId: "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01", value: 99 }));
    expect(screen.getByText("99")).toBeInTheDocument();
  });
});
