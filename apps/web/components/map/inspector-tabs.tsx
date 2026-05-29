"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OverviewPanel, RawPanel, SourcesPanel, TimelinePanel } from "./inspector-panels";
import { isEditableTarget } from "@/lib/map/keyboard";
import type { TimeWindow, ZoneDetailResponse } from "@/lib/map/zone-detail-response";

interface InspectorTabsProps {
  outbreakId: string;
  selectedAdmin1?: { code: string; name: string };
  timeWindow?: TimeWindow;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "sources", label: "Sources" },
  { id: "raw", label: "Raw" },
] as const;

const TAB_KEYS: Record<string, string> = {
  "1": "overview",
  "2": "timeline",
  "3": "sources",
  "4": "raw",
};

type FetchStatus = "error" | "idle" | "loading";

export function InspectorTabs({
  outbreakId,
  selectedAdmin1,
  timeWindow = "all",
}: Readonly<InspectorTabsProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "overview";

  const code = selectedAdmin1?.code;
  const { data, status } = useZoneDetail(code, outbreakId, timeWindow);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) {
        return;
      }
      const tabId = TAB_KEYS[e.key];
      if (tabId === undefined) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [router, searchParams]);

  function selectTab(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <aside
      data-inspector-tabs=""
      className="flex w-[380px] flex-col border-[var(--color-border)] border-l bg-[var(--color-surface-1)]"
      id="inspector"
      aria-label="Region inspector"
    >
      {/* Announce keyboard zone-cycle ([ / ]) selections to screen readers — the zones are
          canvas-rendered with no focusable node, so this status region is the parity mechanism. */}
      <div role="status" aria-live="polite" className="sr-only">
        {selectedAdmin1 === undefined ? "" : `Selected region: ${selectedAdmin1.name}`}
      </div>
      <TabBar currentTab={currentTab} onSelect={selectTab} />
      <div
        role="tabpanel"
        id={`panel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        className="flex-1 overflow-y-auto p-3"
      >
        <InspectorBody
          currentTab={currentTab}
          data={data}
          status={status}
          zoneName={selectedAdmin1?.name}
        />
      </div>
    </aside>
  );
}

function InspectorBody({
  currentTab,
  data,
  status,
  zoneName,
}: Readonly<{
  currentTab: string;
  data: null | ZoneDetailResponse;
  status: FetchStatus;
  zoneName: string | undefined;
}>) {
  if (zoneName === undefined) {
    return <p className="text-[var(--color-fg-subtle)] text-sm">Click a region to inspect.</p>;
  }
  if (status === "error") {
    return <p className="text-[var(--color-emergency)] text-sm">Failed to load zone detail.</p>;
  }
  if (data === null) {
    return <p className="text-[var(--color-fg-subtle)] text-sm">Loading {zoneName}…</p>;
  }

  switch (currentTab) {
    case "raw": {
      return <RawPanel rawRows={data.rawRows} />;
    }
    case "sources": {
      return <SourcesPanel documents={data.documents} />;
    }
    case "timeline": {
      return <TimelinePanel series={data.series} />;
    }
    default: {
      return (
        <OverviewPanel zoneName={zoneName} totals={data.totals} sourceCount={data.sourceCount} />
      );
    }
  }
}

/** APG arrow-key target index for the tablist; -1 for keys that should be ignored. */
function nextTabIndex(current: string, key: string): number {
  const idx = TABS.findIndex((t) => t.id === current);
  const last = TABS.length - 1;
  if (key === "ArrowRight") {
    return idx >= last ? 0 : idx + 1;
  }
  if (key === "ArrowLeft") {
    return idx <= 0 ? last : idx - 1;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return last;
  }
  return -1;
}

/** Tablist following the WAI-ARIA APG: roving tabindex (active tab is the only tab stop) plus
 *  Left/Right/Home/End navigation handled on the focusable tab buttons themselves. */
function TabBar({
  currentTab,
  onSelect,
}: Readonly<{ currentTab: string; onSelect: (id: string) => void }>) {
  return (
    <div
      role="tablist"
      aria-label="Region inspector views"
      className="flex border-[var(--color-border)] border-b"
    >
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={tab.id === currentTab}
          aria-controls={`panel-${tab.id}`}
          tabIndex={tab.id === currentTab ? 0 : -1}
          data-tab={tab.id}
          className={`px-3 py-2 font-mono text-[11px] uppercase tracking-wide transition-colors ${
            tab.id === currentTab
              ? "border-[var(--color-accent)] border-b-2 text-[var(--color-fg)]"
              : "text-[var(--color-fg-subtle)] hover:text-[var(--color-fg)]"
          }`}
          onClick={() => {
            onSelect(tab.id);
          }}
          onKeyDown={(e) => {
            const target = TABS[nextTabIndex(currentTab, e.key)];
            if (target === undefined) {
              return;
            }
            e.preventDefault();
            onSelect(target.id);
            const el = e.currentTarget.parentElement?.querySelector(`#tab-${target.id}`);
            if (el instanceof HTMLElement) {
              el.focus();
            }
          }}
          title={`Keyboard shortcut: ${i + 1}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function useZoneDetail(
  code: string | undefined,
  outbreakId: string,
  timeWindow: TimeWindow,
): { data: null | ZoneDetailResponse; status: FetchStatus } {
  const [data, setData] = useState<null | ZoneDetailResponse>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");

  useEffect(() => {
    if (code === undefined) {
      return () => {
        // No active fetch to abort when no region is selected.
      };
    }
    const ctrl = new AbortController();
    const url = `/api/zone/${encodeURIComponent(code)}?outbreak_id=${encodeURIComponent(outbreakId)}&window=${timeWindow}`;
    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) {
          setStatus("error");
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- trusted internal /api/zone JSON, shape validated server-side
        setData((await res.json()) as ZoneDetailResponse);
        setStatus("idle");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setStatus("error");
        }
      }
    }
    void load();
    return () => {
      ctrl.abort();
    };
  }, [code, timeWindow, outbreakId]);

  // No region selected → nothing fetched yet; report idle with no data.
  if (code === undefined) {
    return { data: null, status: "idle" };
  }
  return { data, status };
}
