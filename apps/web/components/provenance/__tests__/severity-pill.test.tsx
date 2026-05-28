import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SeverityPill } from "../severity-pill";

const RE_BG_INFO = /bg-info/;
const RE_BG_WARN = /bg-warn/;
const RE_BG_ALERT = /bg-alert/;
const RE_BG_EMERGENCY = /bg-emergency/;

describe("SeverityPill", () => {
  it("renders the label text", () => {
    render(<SeverityPill level="info" label="INFO" />);
    expect(screen.getByText("INFO")).toBeInTheDocument();
  });

  it("applies info color classes", () => {
    const { container } = render(<SeverityPill level="info" label="INFO" />);
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toMatch(RE_BG_INFO);
  });

  it("applies warn color classes", () => {
    const { container } = render(<SeverityPill level="warn" label="WARN" />);
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toMatch(RE_BG_WARN);
  });

  it("applies alert color classes", () => {
    const { container } = render(<SeverityPill level="alert" label="ALERT" />);
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toMatch(RE_BG_ALERT);
  });

  it("applies emergency color classes", () => {
    const { container } = render(<SeverityPill level="emergency" label="EMERGENCY" />);
    const pill = container.firstChild as HTMLElement;
    expect(pill.className).toMatch(RE_BG_EMERGENCY);
  });

  it("renders a dot prefix element", () => {
    const { container } = render(<SeverityPill level="info" label="INFO" />);
    const dot = container.querySelector("[aria-hidden]");
    expect(dot).not.toBeNull();
  });
});
