"use client";

import type { ReactNode } from "react";

import { ProvenanceBadge, toTier } from "./provenance-badge";
import type { SerializedQuote } from "./types";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface SourceQuoteCardProps {
  children: ReactNode;
  className?: string;
  onOpenDrawer?: () => void;
  quote: SerializedQuote;
}

function SourceQuoteCard({
  quote,
  children,
  onOpenDrawer,
  className,
}: Readonly<SourceQuoteCardProps>) {
  return (
    <HoverCard openDelay={80} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className={cn("w-80 p-0", className)}
        data-source-quote-card=""
        side="top"
        sideOffset={6}
      >
        <div className="flex flex-col gap-3 rounded-[--radius-md] p-3 shadow-lg">
          <ProvenanceBadge
            sourceName={quote.sourceName}
            tier={toTier(quote.licenseTier)}
            publishedAt={quote.publishedAt}
          />
          <blockquote className="line-clamp-5 font-serif text-[14px] text-fg italic leading-relaxed">
            {quote.quoteText}
          </blockquote>
          {onOpenDrawer === undefined ? null : (
            <button
              type="button"
              className="self-start font-mono text-[12px] text-accent underline-offset-2 hover:underline"
              onClick={onOpenDrawer}
            >
              View evidence →
            </button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export { SourceQuoteCard };
