import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../theme-toggle";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: undefined as string | undefined, setTheme: vi.fn() }),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuRadioItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Guard: ThemeToggle must return null when theme is undefined to avoid SSR hydration mismatch.
describe("ThemeToggle", () => {
  it("renders nothing when theme is undefined (prevents SSR hydration mismatch)", () => {
    const { container } = render(<ThemeToggle />);
    expect(container.firstChild).toBeNull();
  });
});
