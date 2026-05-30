import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(() => ({ execute: mockExecute, isPending: false })),
}));

vi.mock("@/app/internal/sources/actions", () => ({
  toggleSourcePauseAction: vi.fn(),
}));

const RE_PAUSE = /^pause$/i;
const RE_RESUME = /^resume$/i;

describe("SourcePauseButton", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("renders Pause when source is active", async () => {
    const { SourcePauseButton } = await import("../source-pause-button");
    render(<SourcePauseButton sourceId="test-id" paused={false} />);
    expect(screen.getByRole("button", { name: RE_PAUSE })).toBeInTheDocument();
  });

  it("renders Resume when source is paused", async () => {
    const { SourcePauseButton } = await import("../source-pause-button");
    render(<SourcePauseButton sourceId="test-id" paused={true} />);
    expect(screen.getByRole("button", { name: RE_RESUME })).toBeInTheDocument();
  });

  it("calls execute with paused=true when clicking Pause", async () => {
    const user = userEvent.setup();
    const { SourcePauseButton } = await import("../source-pause-button");
    render(<SourcePauseButton sourceId="abc-123" paused={false} />);
    await user.click(screen.getByRole("button", { name: RE_PAUSE }));
    expect(mockExecute).toHaveBeenCalledWith({ sourceId: "abc-123", paused: true });
  });

  it("calls execute with paused=false when clicking Resume", async () => {
    const user = userEvent.setup();
    const { SourcePauseButton } = await import("../source-pause-button");
    render(<SourcePauseButton sourceId="abc-456" paused={true} />);
    await user.click(screen.getByRole("button", { name: RE_RESUME }));
    expect(mockExecute).toHaveBeenCalledWith({ sourceId: "abc-456", paused: false });
  });
});
