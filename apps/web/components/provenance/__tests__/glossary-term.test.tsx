import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GlossaryTerm } from "../glossary-term";

const RE_BORDER_DOTTED = /border-dotted/;
const RE_CURSOR_HELP = /cursor-help/;
const RE_CUSTOM_CLASS = /custom-class/;

describe("GlossaryTerm", () => {
  it("renders the term text", () => {
    render(<GlossaryTerm term="CFR" definition="Case fatality ratio: deaths / cases." />);
    expect(screen.getByText("CFR")).toBeInTheDocument();
  });

  it("renders with dotted-underline cursor-help classes", () => {
    render(<GlossaryTerm term="CFR" definition="Case fatality ratio." />);
    const trigger = screen.getByText("CFR");
    expect(trigger.className).toMatch(RE_BORDER_DOTTED);
    expect(trigger.className).toMatch(RE_CURSOR_HELP);
  });

  it("passes custom className", () => {
    render(<GlossaryTerm term="CFR" definition="Case fatality ratio." className="custom-class" />);
    const trigger = screen.getByText("CFR");
    expect(trigger.className).toMatch(RE_CUSTOM_CLASS);
  });
});
