"use client";

import Link from "next/link";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface GlossaryTermProps {
  className?: string;
  definition: string;
  methodsAnchor?: string;
  term: string;
}

function GlossaryTerm({ term, definition, methodsAnchor, className }: Readonly<GlossaryTermProps>) {
  const href = methodsAnchor === undefined ? "/methods" : `/methods#${methodsAnchor}`;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className={cn(
            "inline cursor-help border-fg-subtle border-b border-dotted",
            "text-inherit",
            className,
          )}
        >
          {term}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-3" align="start">
        <p className="font-serif text-[14px] text-fg italic leading-normal">{definition}</p>
        <Link href={href} className="mt-2 block font-mono text-[11px] text-accent hover:underline">
          Methods: {term} →
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}

export { GlossaryTerm };
