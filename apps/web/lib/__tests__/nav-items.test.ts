import { describe, expect, it } from "vitest";

import { NAV_ITEMS } from "../nav-items";

const RE_ABSOLUTE_PATH = /^\//;

describe("NAV_ITEMS", () => {
  it("contains exactly 6 items", () => {
    expect(NAV_ITEMS).toHaveLength(6);
  });

  it("has Methods as the only non-mobile-visible item", () => {
    const mobileHidden = NAV_ITEMS.filter((item) => !item.mobileVisible);
    expect(mobileHidden).toHaveLength(1);
    expect(mobileHidden[0]?.slug).toBe("methods");
  });

  it("includes all 5 mobile-visible items in expected order", () => {
    const mobileSlugs = NAV_ITEMS.filter((item) => item.mobileVisible).map((item) => item.slug);
    expect(mobileSlugs).toEqual(["today", "map", "outbreaks", "sitreps", "sources"]);
  });

  it("each item has slug, href, label, icon, mobileVisible", () => {
    for (const item of NAV_ITEMS) {
      expect(item.slug).toBeTruthy();
      expect(item.href).toMatch(RE_ABSOLUTE_PATH);
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
      expect(typeof item.mobileVisible).toBe("boolean");
    }
  });
});
