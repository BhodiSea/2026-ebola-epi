import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveOutbreakBanner } from "../active-outbreak-banner";
import type { Outbreak } from "@/lib/queries/outbreaks";

vi.mock("server-only", () => ({}));

const MOCK_OUTBREAK: Outbreak = {
  id: "d0eebc99-0000-0000-0000-000000000001",
  pathogenIcd11: "1D60.00",
  pathogenSlug: "bundibugyo",
  countryIso3: "COD",
  onsetDate: "2026-04-20",
  name: "Bundibugyo virus disease — Ituri Province",
  status: "active",
  severityLevel: "emergency",
  createdAt: "2026-04-20T00:00:00Z",
};

const QUOTE_ID = "00000000-0000-0000-0000-000000000001";
const DAY_N_RE = /^Day \d+$/;
const PATHOGEN_NAME_RE = /Bundibugyo/;
const LAST_SITREP_RE = /last sitrep/;

describe("ActiveOutbreakBanner", () => {
  it("renders SeverityPill with emergency css class", () => {
    const jsx = ActiveOutbreakBanner({ outbreak: MOCK_OUTBREAK, confirmedQuoteId: QUOTE_ID });
    const { container } = render(jsx);
    expect(container.innerHTML).toContain("bg-emergency");
  });

  it("renders Day N text where N is a positive integer", () => {
    render(ActiveOutbreakBanner({ outbreak: MOCK_OUTBREAK, confirmedQuoteId: QUOTE_ID }));
    expect(screen.getByText(DAY_N_RE)).toBeInTheDocument();
  });

  it("renders a link pointing to /map", () => {
    const { container } = render(
      ActiveOutbreakBanner({ outbreak: MOCK_OUTBREAK, confirmedQuoteId: QUOTE_ID }),
    );
    expect(container.querySelector("a[href='/map']")).not.toBeNull();
  });

  it("renders the outbreak name", () => {
    render(ActiveOutbreakBanner({ outbreak: MOCK_OUTBREAK, confirmedQuoteId: QUOTE_ID }));
    expect(screen.getByText(PATHOGEN_NAME_RE)).toBeInTheDocument();
  });

  it("stores confirmedQuoteId in a data attribute", () => {
    const { container } = render(
      ActiveOutbreakBanner({ outbreak: MOCK_OUTBREAK, confirmedQuoteId: QUOTE_ID }),
    );
    expect(container.querySelector(`[data-confirmed-quote="${QUOTE_ID}"]`)).not.toBeNull();
  });

  it("shows last-sitrep label when lastIngestedAt is provided", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(
      ActiveOutbreakBanner({
        outbreak: MOCK_OUTBREAK,
        confirmedQuoteId: QUOTE_ID,
        lastIngestedAt: threeDaysAgo,
      }),
    );
    expect(screen.getByText(LAST_SITREP_RE)).toBeInTheDocument();
  });

  it("omits last-sitrep label when lastIngestedAt is null", () => {
    render(
      ActiveOutbreakBanner({
        outbreak: MOCK_OUTBREAK,
        confirmedQuoteId: QUOTE_ID,
        lastIngestedAt: null,
      }),
    );
    expect(screen.queryByText(LAST_SITREP_RE)).toBeNull();
  });
});
