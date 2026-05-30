// @vitest-environment jsdom
/* eslint-disable unicorn/prefer-global-this -- fireEvent targets window (jsdom DOM node); globalThis type lacks Next.js Window augmentations */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockExecute } = vi.hoisted(() => ({ mockExecute: vi.fn() }));

vi.mock("server-only", () => ({}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDraggable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    listeners: {},
    attributes: {},
    transform: null,
  })),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}));

vi.mock("@/app/internal/escalations/actions", () => ({
  ackIncidentAction: vi.fn(),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(() => ({ execute: mockExecute, isPending: false })),
}));

vi.mock("@/components/internal/ack-button", () => ({
  AckButton: ({ incidentId }: { incidentId: string }) => (
    <button type="button" data-testid={`ack-${incidentId}`}>
      Ack
    </button>
  ),
}));

const INCIDENTS = [
  {
    id: "inc-1",
    class: "anomaly" as const,
    status: "open",
    detail: { summary: "Alert A" },
    document_id: null,
    created_at: "2026-05-30T00:00:00Z",
  },
  {
    id: "inc-2",
    class: "conflict_unresolvable" as const,
    status: "open",
    detail: { summary: "Alert B" },
    document_id: null,
    created_at: "2026-05-30T00:00:00Z",
  },
];

describe("EscalationsBoard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders all incident cards", async () => {
    const { EscalationsBoard } = await import("../escalations-board");
    render(<EscalationsBoard incidents={INCIDENTS} />);
    expect(screen.getByTestId("card-inc-1")).toBeDefined();
    expect(screen.getByTestId("card-inc-2")).toBeDefined();
  });

  it("j key focuses the first card", async () => {
    const { EscalationsBoard } = await import("../escalations-board");
    render(<EscalationsBoard incidents={INCIDENTS} />);
    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    expect(screen.getByTestId("card-inc-1").dataset.focused).toBe("true");
  });

  it("k key moves focus to the previous card", async () => {
    const { EscalationsBoard } = await import("../escalations-board");
    render(<EscalationsBoard incidents={INCIDENTS} />);
    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "k" });
    });
    expect(screen.getByTestId("card-inc-1").dataset.focused).toBe("true");
  });

  it("c key calls ackIncidentAction on the focused card", async () => {
    const { EscalationsBoard } = await import("../escalations-board");
    render(<EscalationsBoard incidents={INCIDENTS} />);
    act(() => {
      fireEvent.keyDown(window, { key: "j" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "c" });
    });
    expect(mockExecute).toHaveBeenCalledWith({ incidentId: "inc-1" });
  });
});
