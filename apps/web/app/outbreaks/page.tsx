import "server-only";

import type { Metadata } from "next";

import { FilterChips } from "@/components/outbreak/filter-chips";
import { OutbreakRow } from "@/components/outbreak/outbreak-row";
import { listOutbreaks } from "@/lib/queries/outbreaks";

export const metadata: Metadata = {
  title: "Outbreaks",
  description:
    "All tracked outbreaks with source-cited epidemiological figures, severity levels, and provenance links.",
  openGraph: {
    title: "Outbreaks — ituri-sitrep",
    description: "Tracked outbreaks with provenance-first epidemiological data.",
  },
};

export default async function OutbreaksPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const pathogen = typeof params.pathogen === "string" ? params.pathogen : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  const statusFilter = status === "all" ? undefined : (status ?? "active");
  const outbreaks = await listOutbreaks({
    ...(pathogen !== undefined && { pathogen }),
    ...(statusFilter !== undefined && { status: statusFilter }),
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-bold text-[24px]">Outbreaks</h1>
        <span className="font-mono text-[12px] text-fg-muted">{outbreaks.length} results</span>
      </div>
      <FilterChips
        {...(pathogen !== undefined && { currentPathogen: pathogen })}
        currentStatus={status ?? "active"}
      />
      {outbreaks.length === 0 ? (
        <p className="font-mono text-[13px] text-fg-muted">
          No outbreaks match your filters yet — try widening the time window.
        </p>
      ) : (
        <div className="space-y-2">
          {outbreaks.map((outbreak) => (
            <OutbreakRow key={outbreak.id} outbreak={outbreak} />
          ))}
        </div>
      )}
    </main>
  );
}
