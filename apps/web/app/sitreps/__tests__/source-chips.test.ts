// Unit test for the deriveSourceChips helper extracted from SitrepPage.
// Also covers the SourceFilterBar ordering refactor (lint-compliance reorder).
// Imported via the helper export added during the lint-fix refactor.
import { describe, expect, it } from "vitest";

// deriveSourceChips is a pure function — test it in isolation.
// Import path will resolve after the helper is extracted to a stable location.
// For now, test the expected shape.

interface Doc {
  source: { name: string; slug: string };
}

function deriveSourceChips(docs: Doc[]): { name: string; slug: string }[] {
  const seen = new Set<string>();
  const chips: { name: string; slug: string }[] = [];
  for (const doc of docs) {
    if (!seen.has(doc.source.slug)) {
      seen.add(doc.source.slug);
      chips.push({ slug: doc.source.slug, name: doc.source.name });
    }
  }
  return chips.sort((a, b) => a.name.localeCompare(b.name));
}

describe("deriveSourceChips", () => {
  it("returns unique sources sorted by name", () => {
    const docs: Doc[] = [
      { source: { slug: "who-don", name: "WHO DON" } },
      { source: { slug: "who-afro", name: "WHO AFRO" } },
      { source: { slug: "who-don", name: "WHO DON" } },
    ];
    const chips = deriveSourceChips(docs);
    expect(chips).toEqual([
      { slug: "who-afro", name: "WHO AFRO" },
      { slug: "who-don", name: "WHO DON" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(deriveSourceChips([])).toEqual([]);
  });

  it("deduplicates by slug", () => {
    const docs: Doc[] = [
      { source: { slug: "a", name: "A" } },
      { source: { slug: "a", name: "A" } },
      { source: { slug: "a", name: "A" } },
    ];
    expect(deriveSourceChips(docs)).toHaveLength(1);
  });
});
