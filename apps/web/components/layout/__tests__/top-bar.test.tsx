import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBar } from "../top-bar";

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { [key: string]: unknown; children: React.ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("./theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("../theme-toggle", () => ({ ThemeToggle: () => null }));

describe("TopBar", () => {
  it("live indicator uses text-fg-muted (not text-fg-subtle) for WCAG AA contrast", () => {
    const { container } = render(<TopBar />);
    // The live indicator wraps the pulse dot + 'Live' text
    const liveDiv = container.querySelector("[title]");
    expect(liveDiv).not.toBeNull();
    expect(liveDiv?.className).not.toContain("text-fg-subtle");
    expect(liveDiv?.className).toContain("text-fg-muted");
  });
});
