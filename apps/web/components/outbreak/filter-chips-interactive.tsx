"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { Pathogen } from "@/lib/queries/outbreaks";

interface FilterChipsInteractiveProps {
  currentPathogen?: string;
  currentStatus?: string;
  pathogens: Pathogen[];
}

function FilterChipsInteractive({
  currentPathogen,
  currentStatus,
  pathogens,
}: Readonly<FilterChipsInteractiveProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function reset() {
    router.push("?", { scroll: false });
  }

  const hasFilters =
    (currentPathogen !== undefined && currentPathogen !== "") ||
    (currentStatus !== undefined && currentStatus !== "");

  return (
    <div data-filter-chips className="flex flex-wrap items-center gap-2">
      <select
        className="rounded border bg-card px-2 py-1 font-mono text-[12px]"
        value={currentPathogen ?? ""}
        onChange={(e) => {
          update("pathogen", e.target.value);
        }}
        aria-label="Filter by pathogen"
      >
        <option value="">All pathogens</option>
        {pathogens.map((p) => (
          <option key={p.pathogenSlug ?? p.pathogenIcd11} value={p.pathogenSlug ?? p.pathogenIcd11}>
            {p.pathogenSlug ?? p.pathogenIcd11}
          </option>
        ))}
      </select>
      <select
        className="rounded border bg-card px-2 py-1 font-mono text-[12px]"
        value={currentStatus ?? "active"}
        onChange={(e) => {
          update("status", e.target.value);
        }}
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        <option value="active">Active</option>
        <option value="resolved">Resolved</option>
      </select>
      {hasFilters ? (
        <button
          type="button"
          onClick={reset}
          className="font-mono text-[12px] text-fg-muted underline-offset-2 hover:underline"
        >
          Reset filters
        </button>
      ) : null}
    </div>
  );
}

export { FilterChipsInteractive };
