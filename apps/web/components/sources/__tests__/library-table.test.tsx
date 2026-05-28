import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SourceLibraryTable } from "../source-library-table";

const SOURCES = [
  {
    id: "src-001",
    slug: "who-don",
    name: "WHO DON",
    url: "https://who.int/don",
    trustScore: 0.95,
    licenseTier: "open" as const,
    licenseUrl: null,
    attributionRequired: true,
    metadata: {},
    createdAt: "2026-01-01T00:00:00Z",
    lastFetch: "2026-05-28T00:00:00Z",
    docCount: 12,
  },
  {
    id: "src-002",
    slug: "ecdc",
    name: "ECDC",
    url: "https://ecdc.europa.eu",
    trustScore: 0.9,
    licenseTier: "open" as const,
    licenseUrl: null,
    attributionRequired: false,
    metadata: {},
    createdAt: "2026-01-01T00:00:00Z",
    lastFetch: null,
    docCount: 3,
  },
];

describe("SourceLibraryTable", () => {
  it("renders a row for each source", () => {
    render(<SourceLibraryTable sources={SOURCES} initialQuery="" />);
    expect(screen.getByText("WHO DON")).toBeInTheDocument();
    expect(screen.getByText("ECDC")).toBeInTheDocument();
  });

  it("renders all source names initially with no filter", () => {
    render(<SourceLibraryTable sources={SOURCES} initialQuery="" />);
    const rows = document.querySelectorAll("[data-source-row]");
    expect(rows.length).toBe(2);
  });
});
