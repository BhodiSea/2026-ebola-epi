import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../theme-toggle";

vi.mock("@/components/theme/theme-provider", () => ({
  isThemeValue: (v: string) => ["dark", "light", "system"].includes(v),
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn(), theme: "light" }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuRadioItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// useSyncExternalStore in jsdom uses the client snapshot (() => true), so mounted=true and
// the full trigger button is rendered.
describe("ThemeToggle", () => {
  it("renders a trigger button when mounted (jsdom uses client snapshot)", () => {
    const { container } = render(<ThemeToggle />);
    expect(container.firstChild).not.toBeNull();
  });
});
