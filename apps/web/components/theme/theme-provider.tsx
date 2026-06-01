"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeValue) => void;
  theme: ThemeValue;
}

type ThemeValue = "dark" | "light" | "system";

const STORAGE_KEY = "theme";
const ThemeContext = createContext<null | ThemeContextValue>(null);
const VALID_THEMES = ["dark", "light", "system"] as const;

function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
}

function isThemeValue(v: string): v is ThemeValue {
  return (VALID_THEMES as readonly string[]).includes(v);
}

function readLocalStorage(key: string): null | string {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // localStorage unavailable (private browsing, sandboxed)
  }
}

function resolveSystem(): ResolvedTheme {
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<ThemeValue>(() => {
    try {
      const stored = readLocalStorage(STORAGE_KEY);
      return stored !== null && isThemeValue(stored) ? stored : "system";
    } catch {
      return "system";
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    try {
      const stored = readLocalStorage(STORAGE_KEY);
      const t: ThemeValue = stored !== null && isThemeValue(stored) ? stored : "system";
      return t === "system" ? resolveSystem() : t;
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") {
        setResolvedTheme(resolveSystem());
      }
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) {
        return;
      }
      const next: ThemeValue =
        e.newValue !== null && isThemeValue(e.newValue) ? e.newValue : "system";
      const resolved: ResolvedTheme = next === "system" ? resolveSystem() : next;
      setThemeState(next);
      setResolvedTheme(resolved);
    };
    globalThis.addEventListener("storage", onStorage);
    return () => {
      globalThis.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = useCallback((next: ThemeValue) => {
    const resolved: ResolvedTheme = next === "system" ? resolveSystem() : next;
    writeLocalStorage(STORAGE_KEY, next);
    setThemeState(next);
    setResolvedTheme(resolved);
  }, []);

  const value = useMemo(
    () => ({ resolvedTheme, setTheme, theme }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error("useTheme must be called inside ThemeProvider");
  }
  return ctx;
}

function writeLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false; // localStorage unavailable
  }
}

export type { ResolvedTheme, ThemeValue };
export { isThemeValue, ThemeProvider, useTheme };
