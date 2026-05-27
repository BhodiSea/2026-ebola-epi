// Phase 0 monorepo migration — tdd-guard escape hatch (proxy.ts String.raw fix, config-only refactor)
import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("lets later Tailwind utilities win over earlier conflicting ones", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy entries", () => {
    expect(cn("a", false, null, undefined, "c")).toBe("a c");
  });
});
