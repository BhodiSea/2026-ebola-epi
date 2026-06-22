"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { DisagreementEntry } from "@/lib/queries/case-counts";
import { cn } from "@/lib/utils";

interface DisagreementPillProps {
  count: number;
  entries: DisagreementEntry[];
}

function DisagreementPill({ count, entries }: Readonly<DisagreementPillProps>) {
  return (
    <HoverCard openDelay={80} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          data-disagreement-pill
          className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 font-mono text-[11px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-400"
        >
          +{count} disagreement
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-0" data-disagreement-table="" side="top" sideOffset={6}>
        <div className="flex flex-col gap-1 rounded-[--radius-md] p-3 shadow-lg">
          <p className="mb-1 font-mono text-[11px] text-fg-muted uppercase tracking-wide">
            Source comparison
          </p>
          {entries.map((e) => (
            <div key={e.rowId} className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-mono text-[12px] text-fg-muted">{e.sourceSlug}</span>
                <span className="font-mono text-[10px] text-fg-muted opacity-60">
                  trust {e.trustScore.toFixed(2)}
                </span>
              </div>
              <span
                className={cn(
                  "font-mono text-[13px] tabular-nums",
                  e.superseded ? "text-fg-muted line-through opacity-50" : "font-semibold text-fg",
                )}
              >
                {e.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export { DisagreementPill };
