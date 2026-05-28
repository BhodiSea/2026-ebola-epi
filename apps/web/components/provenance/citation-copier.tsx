"use client";

import { useState } from "react";

import type { SerializedQuote } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CitationTab = "apa" | "bibtex" | "plain";

const TABS: CitationTab[] = ["plain", "bibtex", "apa"];

interface CitationCopierProps {
  className?: string;
  quote: SerializedQuote;
}

function buildCitation(q: SerializedQuote, tab: CitationTab): string {
  const year = fmtYear(q.publishedAt);
  const url = q.documentUrl ?? "";
  if (tab === "bibtex") {
    return `@misc{${q.sourceSlug}${year},\n  author={${q.sourceName}},\n  year={${year}},\n  url={${url}}\n}`;
  }
  if (tab === "apa") {
    return `${q.sourceName}. (${year}). Retrieved from ${url}`;
  }
  const date =
    q.publishedAt === null
      ? "n.d."
      : new Date(q.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  const snippet = q.quoteText.length > 80 ? `${q.quoteText.slice(0, 80)}…` : q.quoteText;
  return `${q.sourceName} (${date}). "${snippet}"`;
}

function CitationCopier({ quote, className }: Readonly<CitationCopierProps>) {
  const [tab, setTab] = useState<CitationTab>("plain");
  const [copied, setCopied] = useState(false);

  const citationText = buildCitation(quote, tab);

  function handleCopy() {
    void (async () => {
      try {
        await navigator.clipboard.writeText(citationText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (error: unknown) {
        if (error !== undefined) {
          return;
        } // clipboard write denied — no user feedback
      }
    })();
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded px-2 py-1 font-mono text-[11px] uppercase",
              tab === t ? "bg-accent text-bg" : "text-fg-muted hover:text-fg",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-quote-bg p-3 font-mono text-[11px] text-quote-fg">
        {citationText}
      </pre>
      <Button variant="outline" size="sm" className="self-start" onClick={handleCopy}>
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
}

function fmtYear(iso: null | string): string {
  return iso === null ? "n.d." : String(new Date(iso).getFullYear());
}

export { CitationCopier };
