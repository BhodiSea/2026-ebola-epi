import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BottomTabNav } from "../bottom-tab-nav";

const RE_TODAY = /today/i;
const RE_MAP = /map/i;
const RE_OUTBREAKS = /outbreaks/i;
const RE_SITREPS = /sitreps/i;
const RE_SOURCES = /sources/i;
const RE_BOTTOM_NAV = /bottom navigation/i;

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    [key: string]: unknown;
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("BottomTabNav", () => {
  it("renders the nav with data-bottom-tab-nav attribute", () => {
    const { container } = render(<BottomTabNav />);
    expect(container.querySelector("[data-bottom-tab-nav]")).not.toBeNull();
  });

  it("renders five tab links (Today, Map, Outbreaks, Sitreps, Sources)", () => {
    render(<BottomTabNav />);
    expect(screen.getByRole("link", { name: RE_TODAY })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_MAP })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_OUTBREAKS })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_SITREPS })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: RE_SOURCES })).toBeInTheDocument();
  });

  it("marks the active tab with aria-current=page", () => {
    render(<BottomTabNav />);
    const todayLink = screen.getByRole("link", { name: RE_TODAY });
    expect(todayLink).toHaveAttribute("aria-current", "page");
  });

  it("has a nav element with an accessible label", () => {
    render(<BottomTabNav />);
    expect(screen.getByRole("navigation", { name: RE_BOTTOM_NAV })).toBeInTheDocument();
  });

  it("renders icon elements with aria-hidden to prevent double announcement", () => {
    const { container } = render(<BottomTabNav />);
    const icons = container.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });
});
