"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

import { ackIncidentAction } from "@/app/internal/escalations/actions";
import { AckButton } from "@/components/internal/ack-button";

/* eslint-disable @typescript-eslint/naming-convention */
export interface Incident {
  class: "anomaly" | "conflict_unresolvable" | "novel_pathogen_country" | "substring_verify_fail";
  created_at: string;
  detail: Record<string, unknown>;
  document_id: null | string;
  id: string;
  status: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

type SetFocused = (id: null | string) => void;
type SetItems = (items: Incident[]) => void;
type Execute = (input: { incidentId: string }) => void;

interface KeyArgs {
  execute: Execute;
  focused: null | string;
  items: Incident[];
  setFocused: SetFocused;
  setItems: SetItems;
}

/* eslint-disable @typescript-eslint/naming-convention */
const CLASS_TO_COLUMN: Record<string, string> = {
  anomaly: "AnomalyDetected",
  conflict_unresolvable: "DisagreementGT25%",
  novel_pathogen_country: "LowConfidence",
  substring_verify_fail: "SubstringVerifyFail",
};
/* eslint-enable @typescript-eslint/naming-convention */

const COLUMNS = [
  "AnomalyDetected",
  "LowConfidence",
  "DisagreementGT25%",
  "SubstringVerifyFail",
] as const;

const SHORTCUT_KEYS = new Set(["j", "k", "c"]);

function isActive(i: Incident): boolean {
  return i.status !== "acked";
}

function withoutId(items: Incident[], id: string): Incident[] {
  return items.filter((i) => i.id !== id);
}

function focusIndex(visible: Incident[], focusedId: null | string): number {
  if (focusedId === null) {
    return -1;
  }
  return visible.findIndex((i) => i.id === focusedId);
}

function handleJMove(visible: Incident[], idx: number, setFocused: SetFocused): void {
  const next = visible[(idx + 1) % visible.length];
  if (next !== undefined) {
    setFocused(next.id);
  }
}

function handleKMove(visible: Incident[], idx: number, setFocused: SetFocused): void {
  const prevIdx = idx <= 0 ? visible.length - 1 : idx - 1;
  const prev = visible[prevIdx];
  if (prev !== undefined) {
    setFocused(prev.id);
  }
}

function onKeyDown(e: KeyboardEvent, args: KeyArgs): void {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return;
  }
  if (!SHORTCUT_KEYS.has(e.key)) {
    return;
  }

  const visible = args.items.filter(isActive);
  const idx = focusIndex(visible, args.focused);

  if (e.key === "j") {
    handleJMove(visible, idx, args.setFocused);
  }
  if (e.key === "k") {
    handleKMove(visible, idx, args.setFocused);
  }
  if (e.key === "c" && args.focused !== null) {
    args.execute({ incidentId: args.focused });
    args.setItems(withoutId(args.items, args.focused));
    args.setFocused(null);
  }
}

function incidentLabel(incident: Incident): string {
  const d = incident.detail;
  if (typeof d.summary === "string") {
    return d.summary;
  }
  if (typeof d.message === "string") {
    return d.message;
  }
  return incident.class;
}

function DraggableCard({
  incident,
  isFocused,
}: Readonly<{ incident: Incident; isFocused: boolean }>) {
  const { setNodeRef, listeners, attributes, transform } = useDraggable({
    id: incident.id,
  });
  const dragStyle =
    transform === null ? {} : { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` };

  return (
    <li
      ref={setNodeRef}
      style={dragStyle}
      data-testid={`card-${incident.id}`}
      data-focused={isFocused ? "true" : undefined}
      className={`rounded border border-border bg-surface-1 p-2 font-mono text-[11px] ${isFocused ? "ring-2 ring-fg" : ""}`}
      // eslint-disable-next-line react/jsx-props-no-spreading -- dnd-kit event listeners; no other pattern is idiomatic
      {...listeners}
      // eslint-disable-next-line react/jsx-props-no-spreading -- dnd-kit aria attributes (role, tabIndex, aria-*)
      {...attributes}
    >
      <p className="truncate text-fg">{incidentLabel(incident)}</p>
      <p className="mt-0.5 text-fg-muted">{incident.created_at.slice(0, 10)}</p>
      <AckButton incidentId={incident.id} />
    </li>
  );
}

function ResolvedDropzone() {
  const { setNodeRef, isOver } = useDroppable({ id: "resolved" });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border border-dashed p-4 text-center font-mono text-[11px] text-fg-muted transition-colors ${isOver ? "border-fg bg-surface-1" : "border-border"}`}
    >
      Drop here to resolve
    </div>
  );
}

export function EscalationsBoard({ incidents }: Readonly<{ incidents: Incident[] }>) {
  const [items, setItems] = useState(incidents);
  const [focused, setFocused] = useState<null | string>(null);
  const { execute } = useAction(ackIncidentAction);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      onKeyDown(e, { execute, focused, items, setFocused, setItems });
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [execute, focused, items]);

  function handleDragEnd(event: DragEndEvent) {
    if (event.over?.id !== "resolved") {
      return;
    }
    const draggedId = String(event.active.id);
    execute({ incidentId: draggedId });
    setItems(withoutId(items, draggedId));
  }

  const visible = items.filter(isActive);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colItems = visible.filter((i) => CLASS_TO_COLUMN[i.class] === col);
            return (
              <div key={col} className="rounded-md border border-border bg-bg p-3">
                <h2 className="mb-2 font-mono text-[10px] text-fg-muted uppercase tracking-wide">
                  {col}
                </h2>
                {colItems.length === 0 ? (
                  <p className="font-mono text-[11px] text-fg-subtle">No open items</p>
                ) : (
                  <ul className="space-y-2">
                    {colItems.map((incident) => (
                      <DraggableCard
                        key={incident.id}
                        incident={incident}
                        isFocused={focused === incident.id}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <ResolvedDropzone />
      </div>
    </DndContext>
  );
}
