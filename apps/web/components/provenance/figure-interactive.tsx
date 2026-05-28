"use client";

import { useState } from "react";

import { SourceQuoteCard } from "./source-quote-card";
import { SourceQuoteDrawer } from "./source-quote-drawer";
import type { SerializedQuote } from "./types";
import { cn } from "@/lib/utils";

interface FigureInteractiveProps {
  className?: string;
  description: string;
  quote: SerializedQuote;
  value: number | string;
}

function FigureInteractive({
  value,
  quote,
  description,
  className,
}: Readonly<FigureInteractiveProps>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const descId = `fig-desc-${quote.id}`;

  return (
    <>
      <SourceQuoteCard quote={quote} onOpenDrawer={() => setDrawerOpen(true)}>
        <button
          type="button"
          data-figure=""
          aria-describedby={descId}
          className={cn(
            "cursor-pointer border-accent/60 border-b border-dotted font-mono text-fg",
            className,
          )}
          onClick={() => setDrawerOpen(true)}
        >
          {value}
        </button>
      </SourceQuoteCard>
      <span id={descId} className="sr-only">
        {description}
      </span>
      <SourceQuoteDrawer quote={quote} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  );
}

export { FigureInteractive };
