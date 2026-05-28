"use client";

import Fuse from "fuse.js";
import { useMemo, useState } from "react";

import type { Source } from "@/lib/queries/sources";

interface SourceLibraryTableProps {
  initialQuery: string;
  sources: Source[];
}

/* eslint-disable @typescript-eslint/naming-convention */
const TIER_DOT: Record<string, string> = {
  open: "bg-green-500",
  noncommercial_verified: "bg-yellow-500",
  display_only: "bg-blue-500",
  excluded: "bg-red-500",
};
/* eslint-enable @typescript-eslint/naming-convention */

export function SourceLibraryTable({ sources, initialQuery }: Readonly<SourceLibraryTableProps>) {
  const [query, setQuery] = useState(initialQuery);

  const fuse = useMemo(
    () =>
      new Fuse(sources, {
        keys: ["name", "slug", "licenseTier"],
        threshold: 0.35,
      }),
    [sources],
  );

  const visible = useMemo(
    () => (query === "" ? sources : fuse.search(query).map((r) => r.item)),
    [query, fuse, sources],
  );

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        placeholder="Filter sources…"
        className="mb-4 w-full rounded border bg-card px-3 py-2 font-mono text-[13px]"
        aria-label="Filter sources"
      />
      <table className="w-full text-sm" data-source-library-table>
        <thead>
          <tr className="border-b font-mono text-[11px] text-fg-muted uppercase">
            <th className="py-2 text-left">Source</th>
            <th className="py-2 text-left">Tier</th>
            <th className="py-2 text-right" data-numeric>
              Docs
            </th>
            <th className="py-2 text-right">Last fetch</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((s) => (
            <tr key={s.id} className="border-b last:border-0" data-source-row>
              <td className="py-2">
                <a href={`/sources/${s.slug}`} className="font-semibold hover:underline">
                  {s.name}
                </a>
              </td>
              <td className="py-2">
                <span className="flex items-center gap-1.5 font-mono text-[12px]">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${TIER_DOT[s.licenseTier] ?? "bg-fg-muted"}`}
                    aria-hidden="true"
                  />
                  {s.licenseTier.replaceAll("_", " ")}
                </span>
              </td>
              <td className="py-2 text-right font-mono text-[12px]" data-numeric>
                {s.docCount}
              </td>
              <td className="py-2 text-right font-mono text-[12px] text-fg-muted">
                {ageSince(s.lastFetch)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 ? (
        <p className="mt-4 font-mono text-[13px] text-fg-muted">No sources match your search.</p>
      ) : null}
    </div>
  );
}

function ageSince(iso: null | string): string {
  if (iso === null) {
    return "never";
  }
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}
