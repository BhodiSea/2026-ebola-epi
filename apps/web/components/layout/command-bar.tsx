"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import type { SearchResponse } from "@/app/api/search/route";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { subscribe } from "@/lib/command-bar-store";

function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useSearchGroups(query);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

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

  useEffect(() => subscribe(onOpen), [onOpen]);

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
      <CommandInput
        placeholder="Search outbreaks, sources, zones…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[480px]">
        <CommandEmpty>{query.length >= 2 ? "No results found." : "Type to search…"}</CommandEmpty>
        {groups.map((group, i) => (
          <Fragment key={group.heading}>
            {i > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem key={item.id} asChild onSelect={onClose}>
                  <Link href={item.href}>{item.label}</Link>
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

function useSearchGroups(query: string) {
  const [groups, setGroups] = useState<SearchResponse["groups"]>([]);
  const debounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    const controller = new AbortController();

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        void (async () => {
          try {
            const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
              signal: controller.signal,
            });
            const typed: SearchResponse = r.ok
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- fetch to our own typed API
                ((await r.json()) as SearchResponse)
              : { groups: [] };
            setGroups(typed.groups);
          } catch {
            void 0; // aborted or network error — leave previous results
          }
        })();
      }, 150);
    }

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      controller.abort();
    };
  }, [query]);

  return query.length >= 2 ? groups : [];
}

export { CommandBar };
