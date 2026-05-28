"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface OutbreakTabsProps {
  tabs: TabDef[];
}

interface TabDef {
  content: React.ReactNode;
  id: string;
  label: string;
}

function OutbreakTabs({ tabs }: Readonly<OutbreakTabsProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? tabs[0]?.id ?? "";

  useEffect(() => {
    const tabKeys: Record<string, number> = Object.fromEntries(
      tabs.map((_, i) => [String(i + 1), i]),
    );

    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const idx = tabKeys[e.key];
      if (idx === undefined) {
        return;
      }
      const tab = tabs[idx];
      if (tab !== undefined) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab.id);
        router.push(`?${params.toString()}`, { scroll: false });
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tabs, router, searchParams]);

  function selectTab(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const activeContent = tabs.find((t) => t.id === currentTab)?.content ?? tabs[0]?.content;

  return (
    <div>
      <div role="tablist" className="flex border-b">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === currentTab}
            data-tab={tab.id}
            className={`px-4 py-2 font-mono text-[12px] uppercase tracking-wide transition-colors ${
              tab.id === currentTab
                ? "border-accent border-b-2 text-fg"
                : "text-fg-muted hover:text-fg"
            }`}
            onClick={() => {
              selectTab(tab.id);
            }}
            title={`Keyboard shortcut: ${i + 1}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6">
        {activeContent}
      </div>
    </div>
  );
}

export type { TabDef };
export { OutbreakTabs };
