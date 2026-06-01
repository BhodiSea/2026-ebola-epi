import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isThemeValue, ThemeProvider, useTheme } from "../theme-provider";

function makeMatchMedia(dark: boolean): (query: string) => MediaQueryList {
  const mock = vi
    .fn()
    .mockReturnValue({ addEventListener: vi.fn(), matches: dark, removeEventListener: vi.fn() });
  return mock as (query: string) => MediaQueryList;
}

const getDataTheme = () => document.documentElement.dataset.theme;

function clearDataTheme(): void {
  Reflect.deleteProperty(document.documentElement.dataset, "theme");
}

const useHookUnderTest = () => useTheme();

describe("isThemeValue", () => {
  it("accepts all theme values", () => {
    const valid: string[] = ["dark", "light", "system"];
    for (const v of valid) {
      expect(isThemeValue(v)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    const invalid: string[] = ["blue", ""];
    for (const v of invalid) {
      expect(isThemeValue(v)).toBe(false);
    }
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    clearDataTheme();
    vi.stubGlobal("matchMedia", makeMatchMedia(false));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when used outside ThemeProvider", () => {
    expect(() => renderHook(useHookUnderTest)).toThrow(
      "useTheme must be called inside ThemeProvider",
    );
  });

  it("provides default theme 'system' and resolves to light when OS is light", async () => {
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    expect(result.current.theme).toBe("system");
    expect(result.current.resolvedTheme).toBe("light");
    expect(getDataTheme()).toBe("light");
  });

  it("resolves system theme to dark when OS prefers dark", async () => {
    vi.stubGlobal("matchMedia", makeMatchMedia(true));
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    expect(result.current.resolvedTheme).toBe("dark");
    expect(getDataTheme()).toBe("dark");
  });

  it("reads stored theme from localStorage on mount", async () => {
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
  });

  it("setTheme updates theme state and data-theme attribute", async () => {
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(getDataTheme()).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("setTheme persists selection to localStorage", async () => {
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    act(() => {
      result.current.setTheme("light");
    });
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("storage event from another tab updates theme", async () => {
    const { result } = renderHook(useHookUnderTest, { wrapper: ThemeProvider });
    await act(() => Promise.resolve());
    act(() => {
      globalThis.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: "dark" }));
    });
    expect(result.current.theme).toBe("dark");
    expect(getDataTheme()).toBe("dark");
  });
});
