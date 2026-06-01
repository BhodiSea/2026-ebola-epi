import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "../../layout/theme-toggle";
import { ThemeProvider } from "../theme-provider";

function makeMatchMedia(dark: boolean): (query: string) => MediaQueryList {
  return vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: dark,
    removeEventListener: vi.fn(),
  }) as (query: string) => MediaQueryList;
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("matchMedia", makeMatchMedia(false));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders without throwing when wrapped in ThemeProvider", () => {
    expect(() =>
      render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>,
      ),
    ).not.toThrow();
  });

  it("renders a non-null DOM node inside ThemeProvider", () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
