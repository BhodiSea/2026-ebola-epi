import { describe, expect, it } from "vitest";

import { buildBreadcrumbs } from "../breadcrumbs";

describe("buildBreadcrumbs", () => {
  it("returns a BreadcrumbList schema object", () => {
    const result = buildBreadcrumbs([{ label: "Home", path: "/" }]);
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result["@context"]).toBe("https://schema.org");
  });

  it("uses 1-indexed positions", () => {
    const result = buildBreadcrumbs([
      { label: "Home", path: "/" },
      { label: "Outbreaks", path: "/outbreaks" },
    ]);
    const [first, second] = result.itemListElement;
    expect(first?.position).toBe(1);
    expect(second?.position).toBe(2);
  });

  it("constructs absolute item URLs", () => {
    const result = buildBreadcrumbs([{ label: "Methods", path: "/methods" }]);
    const [first] = result.itemListElement;
    expect(first?.item).toContain("/methods");
  });
});
