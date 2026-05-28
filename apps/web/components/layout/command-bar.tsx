"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const STUB_GROUPS = [
  {
    heading: "Outbreaks",
    items: [{ id: "ituri-2026", label: "Ituri BVD 2026" }],
  },
  {
    heading: "Pathogens",
    items: [{ id: "bundibugyo", label: "Bundibugyo virus" }],
  },
  {
    heading: "Countries",
    items: [{ id: "drc", label: "Democratic Republic of Congo" }],
  },
  {
    heading: "Sources",
    items: [{ id: "who-don", label: "WHO Disease Outbreak News" }],
  },
  {
    heading: "Sitreps",
    items: [{ id: "latest-sitrep", label: "Latest WHO AFRO sitrep" }],
  },
  {
    heading: "Definitions",
    items: [{ id: "case-def", label: "Suspected case definition" }],
  },
] as const;

function CommandBar() {
  const [open, setOpen] = useState(false);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  // Expose open trigger for TopBar button
  useEffect(() => {
    const triggers = document.querySelectorAll("[data-command-trigger]");
    for (const el of triggers) {
      el.addEventListener("click", onOpen);
    }
    return () => {
      for (const el of triggers) {
        el.removeEventListener("click", onOpen);
      }
    };
  }, [onOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search outbreaks, sources, methods…" />
      <CommandList className="max-h-[480px]">
        <CommandEmpty>No results found.</CommandEmpty>
        {STUB_GROUPS.map((group, i) => (
          <Fragment key={group.heading}>
            {i > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem key={item.id} onSelect={onClose}>
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Fragment>
        ))}
      </CommandList>
      <div className="border-border border-t px-3 py-2 font-mono text-[11px] text-fg-subtle">
        ↑↓ navigate · ⏎ select · esc close
      </div>
    </CommandDialog>
  );
}

export { CommandBar };
