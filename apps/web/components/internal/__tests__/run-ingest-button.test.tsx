import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const execute = vi.fn();
  const fetchFn = vi.fn();
  const useActionCallbacks: {
    onError: (() => void) | undefined;
    onSuccess: ((r: { data?: { eventId?: string } }) => void) | undefined;
  } = { onError: undefined, onSuccess: undefined };
  return { execute, fetchFn, useActionCallbacks };
});

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(
    (
      _action: unknown,
      opts: undefined | { onError?: () => void; onSuccess?: (r: unknown) => void },
    ) => {
      mocks.useActionCallbacks.onSuccess = opts?.onSuccess;
      mocks.useActionCallbacks.onError = opts?.onError;
      return { execute: mocks.execute, isPending: false };
    },
  ),
}));

vi.mock("@/app/internal/sources/actions", () => ({
  triggerIngestPollAction: vi.fn(),
}));

vi.stubGlobal("fetch", mocks.fetchFn);

const SLUG = "who-don";
const EVENT_ID = "evt_test_abc123";

// State machine: idle → queued → running → done | failed | timeout; slug must be a RegisteredSourceSlug
const RE_RUN = /^run$/i;
const RE_QUEUED = /queued/i;
const RE_RUNNING = /running/i;
const RE_DONE = /done/i;
const RE_FAILED = /failed/i;

describe("RunIngestButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
    mocks.useActionCallbacks.onSuccess = undefined;
    mocks.useActionCallbacks.onError = undefined;
  });

  it("renders a Run button in idle state", async () => {
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    expect(screen.getByRole("button", { name: RE_RUN })).toBeInTheDocument();
  });

  it("is disabled when the disabled prop is true", async () => {
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} disabled />);
    expect(screen.getByRole("button", { name: RE_RUN })).toBeDisabled();
  });

  it("calls execute with the slug when clicked", async () => {
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: RE_RUN }));
    expect(mocks.execute).toHaveBeenCalledWith({ slug: SLUG });
  });

  it("shows Queued status after action resolves with an eventId", async () => {
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: RE_RUN }));
    act(() => {
      mocks.useActionCallbacks.onSuccess?.({ data: { eventId: EVENT_ID } });
    });
    expect(screen.getByText(RE_QUEUED)).toBeInTheDocument();
  });

  it("shows Running status after poll returns Running", async () => {
    mocks.fetchFn.mockResolvedValue(
      new Response(JSON.stringify({ runs: [{ run_id: "r1", status: "Running" }] }), {
        status: 200,
      }),
    );
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: RE_RUN }));
    act(() => {
      mocks.useActionCallbacks.onSuccess?.({ data: { eventId: EVENT_ID } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2001);
    });
    expect(screen.getByText(RE_RUNNING)).toBeInTheDocument();
  });

  it("shows Done status after poll returns Completed", async () => {
    mocks.fetchFn.mockResolvedValue(
      new Response(JSON.stringify({ runs: [{ run_id: "r1", status: "Completed" }] }), {
        status: 200,
      }),
    );
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: RE_RUN }));
    act(() => {
      mocks.useActionCallbacks.onSuccess?.({ data: { eventId: EVENT_ID } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2001);
    });
    expect(screen.getByText(RE_DONE)).toBeInTheDocument();
  });

  it("shows Failed status after poll returns Failed", async () => {
    mocks.fetchFn.mockResolvedValue(
      new Response(JSON.stringify({ runs: [{ run_id: "r1", status: "Failed" }] }), { status: 200 }),
    );
    const { RunIngestButton } = await import("../run-ingest-button");
    render(<RunIngestButton slug={SLUG} />);
    fireEvent.click(screen.getByRole("button", { name: RE_RUN }));
    act(() => {
      mocks.useActionCallbacks.onSuccess?.({ data: { eventId: EVENT_ID } });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2001);
    });
    expect(screen.getByText(RE_FAILED)).toBeInTheDocument();
  });
});
