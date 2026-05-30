import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileInspector } from "../mobile-inspector";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Root carries data-vaul-drawer plus the testable attributes (snapPoints, modal).
// Content is a transparent pass-through so aria-hidden on the drag handle is visible.
vi.mock("vaul", () => ({
  Drawer: {
    Root: ({
      children,
      snapPoints,
      modal,
    }: {
      children: React.ReactNode;
      modal: boolean;
      snapPoints: number[];
    }) => (
      <div
        data-vaul-drawer=""
        data-snap-points={JSON.stringify(snapPoints)}
        data-modal={String(modal)}
      >
        {children}
      </div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Overlay: () => null,
  },
}));

vi.mock("../inspector-tabs", () => ({
  InspectorTabs: ({ outbreakId }: { outbreakId: string }) => (
    <div data-testid="inspector-tabs" data-outbreak-id={outbreakId} />
  ),
}));

describe("MobileInspector", () => {
  it("renders the vaul drawer root", () => {
    const { container } = render(
      <MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />,
    );
    expect(container.querySelector("[data-vaul-drawer]")).not.toBeNull();
  });

  it("sets snapPoints to [0.12, 0.5, 0.92]", () => {
    const { container } = render(
      <MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />,
    );
    const drawer = container.querySelector("[data-vaul-drawer]");
    expect(JSON.parse(drawer?.getAttribute("data-snap-points") ?? "[]")).toEqual([0.12, 0.5, 0.92]);
  });

  it("sets modal={false} so map stays pannable", () => {
    const { container } = render(
      <MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />,
    );
    const drawer = container.querySelector("[data-vaul-drawer]");
    expect(drawer?.getAttribute("data-modal")).toBe("false");
  });

  it("renders a drag handle with aria-hidden true", () => {
    const { container } = render(
      <MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />,
    );
    const handle = container.querySelector("[aria-hidden='true']");
    expect(handle).not.toBeNull();
  });

  it("renders InspectorTabs inside the drawer", () => {
    render(<MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />);
    expect(screen.getByTestId("inspector-tabs")).toBeInTheDocument();
  });

  it("passes outbreakId down to InspectorTabs", () => {
    render(<MobileInspector outbreakId="d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01" />);
    expect(screen.getByTestId("inspector-tabs")).toHaveAttribute(
      "data-outbreak-id",
      "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
    );
  });
});
