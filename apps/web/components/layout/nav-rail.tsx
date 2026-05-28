"use client";

import {
  AlertCircleIcon,
  BookOpenIcon,
  DatabaseIcon,
  FileTextIcon,
  HomeIcon,
  MapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/today", label: "Today", Icon: HomeIcon },
  { href: "/map", label: "Map", Icon: MapIcon },
  { href: "/outbreaks", label: "Outbreaks", Icon: AlertCircleIcon },
  { href: "/sitreps", label: "Sitreps", Icon: FileTextIcon },
  { href: "/sources", label: "Sources", Icon: DatabaseIcon },
  { href: "/methods", label: "Methods", Icon: BookOpenIcon },
] as const;

function NavRail() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const active = document.activeElement?.tagName;
        if (active === "INPUT" || active === "TEXTAREA") {
          return;
        }
        toggle();
      }
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <aside
      aria-label="Side navigation"
      className={cn(
        "flex h-full flex-col border-border border-r bg-bg transition-[width] duration-150 ease-out",
        expanded ? "w-60" : "w-[60px]",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const NavIcon = item.Icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Tooltip key={item.href} delayDuration={expanded ? 999_999 : 300}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "relative flex h-11 items-center gap-3 px-4 font-sans text-sm transition-colors",
                  "hover:bg-surface-3 hover:text-fg",
                  active ? "text-fg" : "text-fg-muted",
                )}
              >
                {/* Active indicator */}
                {active ? (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-emergency" />
                ) : null}
                <NavIcon size={24} strokeWidth={1.5} className="shrink-0" />
                {expanded ? <span>{item.label}</span> : null}
              </Link>
            </TooltipTrigger>
            {expanded ? null : (
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}

      {/* Collapse toggle at bottom */}
      <button
        type="button"
        onClick={toggle}
        className="mt-auto flex h-10 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
        aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        title="[ to toggle"
      >
        <span className="font-mono text-xs">{expanded ? "←" : "→"}</span>
      </button>
    </aside>
  );
}

export { NavRail };
