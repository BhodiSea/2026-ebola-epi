import { SearchIcon } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/today", label: "Today" },
  { href: "/map", label: "Map" },
  { href: "/outbreaks", label: "Outbreaks" },
  { href: "/sitreps", label: "Sitreps" },
  { href: "/sources", label: "Sources" },
  { href: "/methods", label: "Methods" },
] as const;

function TopBar() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-border border-b bg-bg/80 px-4 backdrop-blur">
      {/* Wordmark */}
      <Link
        href="/"
        className="mr-6 flex items-center gap-2 font-mono font-semibold text-fg text-xs tracking-tight"
      >
        <span className="text-emergency">is</span>
        <span className="text-fg-muted">ituri-sitrep</span>
      </Link>

      {/* Nav links */}
      <nav aria-label="Primary navigation" className="flex items-center gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2.5 py-1.5 font-sans text-[13px] text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right-side controls */}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 font-mono text-fg-muted text-xs"
          aria-label="Open command bar"
          data-command-trigger
        >
          <SearchIcon className="size-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden rounded border border-border px-1 py-0.5 text-[10px] leading-none sm:inline">
            ⌘K
          </kbd>
        </Button>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        {/* Live pulse indicator */}
        <div
          className="flex items-center gap-1.5 font-mono text-fg-subtle text-xs"
          title="Data updated regularly from source documents"
        >
          <span
            className="size-1.5 animate-pulse rounded-full bg-emergency"
            style={{ animationDuration: "1.6s" }}
          />
          <span className="hidden sm:inline">Live</span>
        </div>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden />

        <ThemeToggle />
      </div>
    </header>
  );
}

export { TopBar };
