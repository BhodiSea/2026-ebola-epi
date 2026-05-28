"use client";

import { useEffect } from "react";

import { CitationCopier } from "./citation-copier";
import { ProvenanceBadge, toTier } from "./provenance-badge";
import type { SerializedCaseCount, SerializedQuote } from "./types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface SourceQuoteDrawerProps {
  caseCounts?: SerializedCaseCount[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  quote: SerializedQuote;
}

function CaseCountList({ caseCounts }: Readonly<{ caseCounts: SerializedCaseCount[] }>) {
  if (caseCounts.length === 0) {
    return null;
  }
  return (
    <section>
      <h3 className="mb-2 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
        Used in {caseCounts.length} figure{caseCounts.length === 1 ? "" : "s"}
      </h3>
      <ul className="flex flex-col gap-1">
        {caseCounts.map((cc) => (
          <li
            key={`${cc.geoAdmin2 ?? "null"}-${cc.observedAt ?? "null"}`}
            className="flex items-baseline justify-between font-mono text-[12px] text-fg"
          >
            <span>{cc.geoAdmin2 ?? "—"}</span>
            <span>{cc.value ?? "—"}</span>
            <span className="text-fg-muted">
              {cc.observedAt === null
                ? "—"
                : fmtDate(cc.observedAt, { day: "numeric", month: "short" })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CustodyTable({ quote }: Readonly<{ quote: SerializedQuote }>) {
  const rows = [
    { label: "Published", value: quote.publishedAt === null ? "—" : fmtDate(quote.publishedAt) },
    { label: "Extracted", value: fmtDate(quote.createdAt) },
    { label: "Reviewed", value: "—" },
    { label: "Anomaly", value: "—" },
    { label: "Confidence", value: "—" },
  ];
  return (
    <table className="w-full text-[12px]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-border border-t">
            <td className="py-1 font-mono text-fg-muted">{row.label}</td>
            <td className="py-1 font-mono text-fg">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fmtDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString(
    "en-GB",
    opts ?? { day: "numeric", month: "short", year: "numeric" },
  );
}

function SourceQuoteDrawer({
  quote,
  caseCounts = [],
  open,
  onOpenChange,
}: Readonly<SourceQuoteDrawerProps>) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const url = quote.documentUrl;

    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "o" && url !== null) {
        window.open(url, "_blank", "noopener");
      }
    }

    globalThis.addEventListener("keydown", onKey);
    // eslint-disable-next-line consistent-return -- useEffect cleanup; early exit has no cleanup
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [open, quote.documentUrl]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[480px] gap-6 overflow-y-auto p-6 sm:max-w-[480px]"
        data-source-quote-drawer=""
      >
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Source evidence</SheetTitle>
          <div className="flex items-center justify-between">
            <ProvenanceBadge
              sourceName={quote.sourceName}
              tier={toTier(quote.licenseTier)}
              publishedAt={quote.publishedAt}
            />
            {quote.documentUrl === null ? null : (
              <a
                href={quote.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] text-fg-muted underline-offset-2 hover:underline"
              >
                Open original ↗
              </a>
            )}
          </div>
        </SheetHeader>

        <blockquote className="border-accent border-l-2 pl-4 font-serif text-[16px] text-fg italic leading-relaxed">
          {quote.quoteText}
        </blockquote>

        <CaseCountList caseCounts={caseCounts} />

        <section>
          <h3 className="mb-2 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
            Chain of custody
          </h3>
          <CustodyTable quote={quote} />
        </section>

        <section>
          <h3 className="mb-2 font-mono font-semibold text-[12px] text-fg-muted uppercase tracking-wider">
            Citation
          </h3>
          <CitationCopier quote={quote} />
        </section>
      </SheetContent>
    </Sheet>
  );
}

export { SourceQuoteDrawer };
