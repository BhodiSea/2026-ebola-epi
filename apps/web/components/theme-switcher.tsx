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

const ICON_SIZE = 16;

function noopUnsubscribe(): void {
  // intentional no-op: mounted sentinel has no external store to unsubscribe from
}

function subscribe(_onChange: () => void): () => void {
  return noopUnsubscribe;
}

function ThemeIcon({ theme }: Readonly<{ theme: string }>) {
  if (theme === "light") {
    return <Sun key="light" size={ICON_SIZE} className="text-muted-foreground" />;
  }
  if (theme === "dark") {
    return <Moon key="dark" size={ICON_SIZE} className="text-muted-foreground" />;
  }
  return <Laptop key="system" size={ICON_SIZE} className="text-muted-foreground" />;
}

function ThemeSwitcher() {
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
        <Button variant="ghost" size="sm">
          <ThemeIcon theme={theme} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-content" align="start">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(v) => {
            if (isThemeValue(v)) {
              setTheme(v);
            }
          }}
        >
          <DropdownMenuRadioItem className="flex gap-2" value="light">
            <Sun size={ICON_SIZE} className="text-muted-foreground" /> <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="dark">
            <Moon size={ICON_SIZE} className="text-muted-foreground" /> <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem className="flex gap-2" value="system">
            <Laptop size={ICON_SIZE} className="text-muted-foreground" /> <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ThemeSwitcher };
