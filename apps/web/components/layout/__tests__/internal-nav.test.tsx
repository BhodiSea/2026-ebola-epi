import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/internal/cost"),
}));

const RE_COST = /cost/i;
const RE_PIPELINE = /pipeline/i;
const RE_ESCALATIONS = /escalations/i;
const RE_QUALITY = /quality/i;
const RE_SOURCES = /sources/i;
const RE_AUDIT = /audit/i;

describe("InternalNav", () => {
  it("renders links to all six internal pages", async () => {
    const { InternalNav } = await import("../internal-nav");
    render(<InternalNav />);
    expect(screen.getByRole("link", { name: RE_COST })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_PIPELINE })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_ESCALATIONS })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_QUALITY })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_SOURCES })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_AUDIT })).toBeInTheDocument();
  });

  it("marks the active link with aria-current=page", async () => {
    const { InternalNav } = await import("../internal-nav");
    render(<InternalNav />);
    const costLink = screen.getByRole("link", { name: RE_COST });
    expect(costLink).toHaveAttribute("aria-current", "page");
  });
});
