import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/internal/retry-button", () => ({
  RetryButton: ({ runId }: { runId: string }) => (
    <button type="button" data-testid={`retry-${runId}`}>
      Retry
    </button>
  ),
}));

const FAILED_LABEL_RE = /Failed/i;
const BASE_START = "2026-05-30T10:00:00.000Z";
const BASE_END = "2026-05-30T10:01:00.000Z";

const RUNS = [
  {
    run_id: "run-a",
    function_id: "ingest/process",
    started_at: BASE_START,
    ended_at: BASE_END,
    status: "Completed" as const,
  },
  {
    run_id: "run-b",
    function_id: "ingest/process",
    started_at: BASE_START,
    ended_at: BASE_END,
    status: "Failed" as const,
  },
  {
    run_id: "run-c",
    function_id: "ingest/process",
    started_at: BASE_START,
    ended_at: null,
    status: "Running" as const,
  },
];

describe("PipelineGantt", () => {
  it("renders one bar per run", async () => {
    const { PipelineGantt } = await import("../pipeline-gantt");
    render(<PipelineGantt runs={RUNS} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("failed-run bar has aria-label mentioning 'Failed'", async () => {
    const { PipelineGantt } = await import("../pipeline-gantt");
    render(<PipelineGantt runs={RUNS} />);
    const failedBars = screen.getAllByLabelText(FAILED_LABEL_RE);
    expect(failedBars.length).toBeGreaterThanOrEqual(1);
  });

  it("failed run shows RetryButton", async () => {
    const { PipelineGantt } = await import("../pipeline-gantt");
    render(<PipelineGantt runs={RUNS} />);
    expect(screen.getByTestId("retry-run-b")).toBeDefined();
  });

  it("renders nothing when runs array is empty", async () => {
    const { PipelineGantt } = await import("../pipeline-gantt");
    const { container } = render(<PipelineGantt runs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
