import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OutbreakTabs } from "../outbreak-tabs";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

const TABS = [
  { id: "brief", label: "Brief", content: <div data-testid="brief-content">Brief</div> },
  { id: "epi-curve", label: "Epi curve", content: <div data-testid="epi-content">Epi</div> },
];

describe("OutbreakTabs", () => {
  it("renders a tab button for each tab", () => {
    render(<OutbreakTabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Brief" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Epi curve" })).toBeInTheDocument();
  });

  it("marks the first tab as selected by default", () => {
    render(<OutbreakTabs tabs={TABS} />);
    const briefTab = screen.getByRole("tab", { name: "Brief" });
    expect(briefTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows the first tab's content by default", () => {
    render(<OutbreakTabs tabs={TABS} />);
    expect(screen.getByTestId("brief-content")).toBeInTheDocument();
  });

  it("calls router.push with tab param when a tab is clicked", async () => {
    const user = userEvent.setup();
    render(<OutbreakTabs tabs={TABS} />);
    await user.click(screen.getByRole("tab", { name: "Epi curve" }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("tab=epi-curve"),
      expect.any(Object),
    );
  });
});
