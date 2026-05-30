import { afterEach, describe, expect, it, vi } from "vitest";

import { openCommandBar, subscribe } from "../command-bar-store";

describe("command-bar-store", () => {
  let unsub: (() => void) | undefined;

  afterEach(() => {
    unsub?.();
    unsub = undefined;
  });

  it("notifies a subscriber when openCommandBar is called", () => {
    const listener = vi.fn();
    unsub = subscribe(listener);
    openCommandBar();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    unsubscribe();
    unsub = undefined;
    openCommandBar();
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies multiple subscribers independently", () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribe(a);
    const unsubB = subscribe(b);
    openCommandBar();
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
    unsubA();
    unsubB();
  });
});
