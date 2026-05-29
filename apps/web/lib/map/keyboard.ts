"use client";

export type MapKeyboard = ReturnType<typeof createMapKeyboard>;

export interface MapKeyboardEvent {
  direction?: "down" | "in" | "left" | "next" | "out" | "prev" | "right" | "up";
  type: "cycleFeature" | "cycleLayer" | "cycleTime" | "pan" | "zoom";
}

type Listener = (event: MapKeyboardEvent) => void;

/** Static key → event map. Arrow keys also call preventDefault (see PAN_KEYS). */
/* eslint-disable @typescript-eslint/naming-convention */
const KEY_EVENTS: Record<string, MapKeyboardEvent> = {
  "+": { type: "zoom", direction: "in" },
  "=": { type: "zoom", direction: "in" },
  "-": { type: "zoom", direction: "out" },
  "[": { type: "cycleFeature", direction: "prev" },
  "]": { type: "cycleFeature", direction: "next" },
  ArrowDown: { type: "pan", direction: "down" },
  ArrowLeft: { type: "pan", direction: "left" },
  ArrowRight: { type: "pan", direction: "right" },
  ArrowUp: { type: "pan", direction: "up" },
  l: { type: "cycleLayer" },
  L: { type: "cycleLayer" },
  t: { type: "cycleTime" },
  T: { type: "cycleTime" },
};
/* eslint-enable @typescript-eslint/naming-convention */

const PAN_KEYS = new Set(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"]);

/** Shared keyboard event-bus for map components (MapPane → LayerRail, etc). */
export function createMapKeyboard() {
  const listeners = new Set<Listener>();

  function emit(event: MapKeyboardEvent) {
    for (const l of listeners) {
      l(event);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isEditableTarget(e.target)) {
      return;
    }
    const event = KEY_EVENTS[e.key];
    if (event === undefined) {
      return;
    }
    if (PAN_KEYS.has(e.key)) {
      e.preventDefault();
    }
    emit(event);
  }

  return {
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    handleKeyDown,
    emit,
  };
}

/** True when the event target is a field that should swallow single-key shortcuts — inputs,
 *  textareas, native selects, and contenteditable. Exported so other keyboard handlers (e.g. the
 *  inspector's 1-4 tab shortcuts) apply the same guard and never hijack typing/selection. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
