import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiGeneratedLabel } from "../ai-generated-label";
import { TooltipProvider } from "@/components/ui/tooltip";

function Wrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

describe("AiGeneratedLabel", () => {
  it("renders the ✦ prefix glyph", () => {
    render(<AiGeneratedLabel modelId="editor" />, { wrapper: Wrapper });
    expect(screen.getByText("✦")).toBeInTheDocument();
  });

  it("renders 'Auto-generated' text", () => {
    render(<AiGeneratedLabel modelId="editor" />, { wrapper: Wrapper });
    expect(screen.getByText("Auto-generated")).toBeInTheDocument();
  });

  it("tooltip content is absent without hover (Radix mounts lazily)", () => {
    render(<AiGeneratedLabel modelId="claude-opus-4-7" reviewStatus="Reviewed" />, {
      wrapper: Wrapper,
    });
    // TooltipContent only mounts after pointerEnter (Radix lazy mount) — static render must be content-free
    expect(document.querySelector("[role=tooltip]")).toBeNull();
  });

  it("accepts a dynamic reviewStatus prop without throwing", () => {
    const { unmount } = render(
      <AiGeneratedLabel modelId="claude-opus-4-7" reviewStatus="published" />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText("Auto-generated")).toBeInTheDocument();
    unmount();
  });
});
