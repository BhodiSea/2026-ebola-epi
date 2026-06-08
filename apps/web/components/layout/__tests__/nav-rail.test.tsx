import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NavRail } from "../nav-rail";

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

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { asChild?: boolean; children: React.ReactNode }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode; side?: string }) => <>{children}</>,
}));

describe("NavRail", () => {
  it("all nav links have accessible names (aria-label on icon-only links)", () => {
    render(<NavRail />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link).toHaveAccessibleName();
    }
  });

  it("toggle button uses text-fg-muted for sufficient color contrast", () => {
    const { container } = render(<NavRail />);
    const toggle = container.querySelector("button[aria-label]");
    expect(toggle).not.toBeNull();
    // Must use fg-muted (not fg-subtle) so contrast ratio passes WCAG AA
    expect(toggle?.className).toContain("text-fg-muted");
    expect(toggle?.className).not.toContain("text-fg-subtle");
  });
});
