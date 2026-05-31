"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { MapKeyboard } from "@/lib/map/keyboard";
import { LAYER_GROUPS, LAYERS, parseLayers } from "@/lib/map/layers";

export interface OutbreakOption {
  id: string;
  name: null | string;
}

interface LayerRailProps {
  keyboard: MapKeyboard;
  outbreakId: string;
  outbreaks?: OutbreakOption[];
}

export function LayerRail({ outbreakId, keyboard, outbreaks = [] }: Readonly<LayerRailProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeLayers = useMemo(() => parseLayers(searchParams.get("layers")), [searchParams]);
  const containerRef = useRef<HTMLElement>(null);

  const toggleLayer = useCallback(
    (id: string) => {
      const next = new Set(activeLayers);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("layers", [...next].join(","));
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [activeLayers, router, searchParams],
  );

  useLayerFocusCycle(keyboard, containerRef);

  const onSelectOutbreak = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("outbreak", id);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <aside
      ref={containerRef}
      data-layer-rail=""
      className="flex w-[280px] flex-col gap-4 overflow-y-auto border-[var(--color-border)] border-r bg-[var(--color-surface-1)] p-3"
      id="layer-rail"
      aria-label="Map layers"
    >
      <LayerGroups activeLayers={activeLayers} onToggle={toggleLayer} />

      {outbreaks.length > 0 ? (
        <div className="mt-auto border-[var(--color-border)] border-t pt-3">
          <Label
            htmlFor="outbreak-select"
            className="mb-1 block font-mono text-[10px] text-[var(--color-fg-subtle)] uppercase tracking-wide"
          >
            Outbreak
          </Label>
          <select
            id="outbreak-select"
            value={outbreakId}
            onChange={(e) => {
              onSelectOutbreak(e.target.value);
            }}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-sm"
          >
            {outbreaks.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name ?? o.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </aside>
  );
}

const SHOW_STUB = process.env.NEXT_PUBLIC_SHOW_STUB_LAYERS === "true";

function LayerGroups({
  activeLayers,
  onToggle,
}: Readonly<{ activeLayers: Set<string>; onToggle: (id: string) => void }>) {
  return (
    <>
      {LAYER_GROUPS.map((group) => {
        const layers = LAYERS.filter((l) => l.group === group && (SHOW_STUB || l.data === "live"));
        if (layers.length === 0) {
          return null;
        }
        return (
          <section key={group}>
            <p className="mb-1 font-mono text-[10px] text-[var(--color-fg-subtle)] uppercase tracking-wide">
              {group}
            </p>
            <ul className="space-y-1">
              {layers.map((layer) => (
                <li key={layer.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`layer-${layer.id}`}
                    data-layer-label=""
                    checked={activeLayers.has(layer.id)}
                    aria-label={layer.label}
                    onCheckedChange={() => {
                      onToggle(layer.id);
                    }}
                  />
                  <Label htmlFor={`layer-${layer.id}`} className="cursor-pointer text-sm">
                    {layer.label}
                  </Label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function useLayerFocusCycle(keyboard: MapKeyboard, containerRef: RefObject<HTMLElement | null>) {
  const focusIdxRef = useRef(-1);

  // `L` (cycleLayer) on the keyboard bus moves real DOM focus to the next layer toggle.
  useEffect(() => {
    return keyboard.subscribe((ev) => {
      if (ev.type !== "cycleLayer") {
        return;
      }
      const els = containerRef.current?.querySelectorAll<HTMLElement>("[data-layer-label]");
      if (els === undefined || els.length === 0) {
        return;
      }
      const nextIdx = (focusIdxRef.current + 1) % els.length;
      focusIdxRef.current = nextIdx;
      els[nextIdx]?.focus();
    });
  }, [keyboard, containerRef]);
}
