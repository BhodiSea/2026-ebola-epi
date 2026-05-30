import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/actions/client", () => ({
  internalAction: {
    inputSchema: vi.fn(() => ({ action: vi.fn((h: unknown) => h) })),
  },
}));

vi.mock("@/app/internal/escalations/actions", () => ({
  ackIncidentAction: vi.fn(),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(() => ({ execute: vi.fn(), isPending: false })),
}));

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

vi.mock("@/components/internal/ack-button", () => ({
  AckButton: ({ incidentId }: { incidentId: string }) => (
    <button type="button" data-testid={`ack-${incidentId}`}>
      Ack
    </button>
  ),
}));

const MOCK_INCIDENTS = [
  {
    id: "id-1",
    status: "open",
    class: "anomaly",
    detail: { summary: "Case count spike in Irumu" },
    document_id: null,
    created_at: "2026-05-01T10:00:00Z",
  },
  {
    id: "id-2",
    status: "open",
    class: "novel_pathogen_country",
    detail: { message: "New country detected" },
    document_id: null,
    created_at: "2026-05-02T10:00:00Z",
  },
  {
    id: "id-3",
    status: "open",
    class: "conflict_unresolvable",
    detail: {},
    document_id: "doc-1",
    created_at: "2026-05-03T10:00:00Z",
  },
  {
    id: "id-4",
    status: "open",
    class: "substring_verify_fail",
    detail: {},
    document_id: null,
    created_at: "2026-05-04T10:00:00Z",
  },
  {
    id: "id-5",
    status: "acked",
    class: "anomaly",
    detail: { summary: "Already resolved" },
    document_id: null,
    created_at: "2026-04-30T10:00:00Z",
  },
];

describe("EscalationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four kanban column headers", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as never);

    const { default: EscalationsPage } = await import("../page");
    const jsx = await EscalationsPage();
    render(jsx);

    expect(screen.getByText("AnomalyDetected")).toBeInTheDocument();
    expect(screen.getByText("LowConfidence")).toBeInTheDocument();
    expect(screen.getByText("DisagreementGT25%")).toBeInTheDocument();
    expect(screen.getByText("SubstringVerifyFail")).toBeInTheDocument();
  });

  it("routes incidents to the correct column by class value", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: MOCK_INCIDENTS, error: null }),
          }),
        }),
      }),
    } as never);

    const { default: EscalationsPage } = await import("../page");
    const jsx = await EscalationsPage();
    render(jsx);

    expect(screen.getByText("Case count spike in Irumu")).toBeInTheDocument();
    expect(screen.getByText("New country detected")).toBeInTheDocument();
    expect(screen.getByText("conflict_unresolvable")).toBeInTheDocument();
    expect(screen.getByText("substring_verify_fail")).toBeInTheDocument();
  });

  it("does not render acked incidents", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: MOCK_INCIDENTS, error: null }),
          }),
        }),
      }),
    } as never);

    const { default: EscalationsPage } = await import("../page");
    const jsx = await EscalationsPage();
    render(jsx);

    expect(screen.queryByText("Already resolved")).not.toBeInTheDocument();
  });

  it("renders an Ack button for each open incident", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: MOCK_INCIDENTS, error: null }),
          }),
        }),
      }),
    } as never);

    const { default: EscalationsPage } = await import("../page");
    const jsx = await EscalationsPage();
    render(jsx);

    expect(screen.getByTestId("ack-id-1")).toBeInTheDocument();
    expect(screen.getByTestId("ack-id-2")).toBeInTheDocument();
    expect(screen.getByTestId("ack-id-3")).toBeInTheDocument();
    expect(screen.getByTestId("ack-id-4")).toBeInTheDocument();
    expect(screen.queryByTestId("ack-id-5")).not.toBeInTheDocument();
  });
});
