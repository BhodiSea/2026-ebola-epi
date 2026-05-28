import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LastUpdatedIndicator } from "../last-updated-indicator";

const RE_FRESH = /bg-emerald-500/;
const RE_NEUTRAL = /bg-fg-subtle/;
const RE_WARN = /bg-warn/;
const RE_EMERGENCY = /bg-emergency/;
const RE_PULSE = /animate-pulse/;
const RE_HOUR = /hour/i;
const RE_DAY = /day/i;

const NOW = new Date("2026-05-28T12:00:00Z").getTime();

describe("LastUpdatedIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a pulsing disc for fresh data (<6h)", () => {
    const { container } = render(<LastUpdatedIndicator updatedAt={new Date(NOW - 3_600_000)} />);
    const disc = container.querySelector("[aria-hidden]");
    expect(disc?.className).toMatch(RE_FRESH);
    expect(disc?.className).toMatch(RE_PULSE);
  });

  it("renders neutral disc for 6-24h data", () => {
    const { container } = render(
      <LastUpdatedIndicator updatedAt={new Date(NOW - 12 * 3_600_000)} />,
    );
    const disc = container.querySelector("[aria-hidden]");
    expect(disc?.className).toMatch(RE_NEUTRAL);
  });

  it("renders warn disc for 24-72h data", () => {
    const { container } = render(
      <LastUpdatedIndicator updatedAt={new Date(NOW - 48 * 3_600_000)} />,
    );
    const disc = container.querySelector("[aria-hidden]");
    expect(disc?.className).toMatch(RE_WARN);
  });

  it("renders emergency disc for >72h data", () => {
    const { container } = render(
      <LastUpdatedIndicator updatedAt={new Date(NOW - 96 * 3_600_000)} />,
    );
    const disc = container.querySelector("[aria-hidden]");
    expect(disc?.className).toMatch(RE_EMERGENCY);
  });

  it("formats as hours not minutes for 12h-old data", () => {
    const { getByText } = render(
      <LastUpdatedIndicator updatedAt={new Date(NOW - 12 * 3_600_000)} />,
    );
    // "720 minutes ago" would be broken; should say "12 hours ago" or similar
    expect(getByText(RE_HOUR)).toBeInTheDocument();
  });

  it("formats as days not minutes for 48h-old data", () => {
    const { getByText } = render(
      <LastUpdatedIndicator updatedAt={new Date(NOW - 48 * 3_600_000)} />,
    );
    expect(getByText(RE_DAY)).toBeInTheDocument();
  });
});
