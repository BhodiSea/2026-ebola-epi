"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { isThemeValue, useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function noopUnsubscribe(): void {
  // intentional no-op: mounted sentinel has no external store to unsubscribe from
}

function subscribe(_onChange: () => void): () => void {
  return noopUnsubscribe;
}

function ThemeIcon({ theme }: Readonly<{ theme: string }>) {
  if (theme === "dark") {
    return <Moon className="size-4 text-fg-muted" />;
  }
  if (theme === "light") {
    return <Sun className="size-4 text-fg-muted" />;
  }
  return <Laptop className="size-4 text-fg-muted" />;
}

function ThemeToggle() {
  // useSyncExternalStore: false on server, true on client — consistent hydration placeholder,
  // no setState-in-effect.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return <div aria-hidden className="size-8" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Toggle theme" size="icon-sm" variant="ghost">
          <ThemeIcon theme={theme} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => {
            if (isThemeValue(v)) {
              setTheme(v);
            }
          }}
        >
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeToggle };
