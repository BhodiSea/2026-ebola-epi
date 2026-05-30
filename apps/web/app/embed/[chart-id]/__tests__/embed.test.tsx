import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({ "chart-id": "epi-curve" })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

function post(data: unknown) {
  act(() => {
    globalThis.dispatchEvent(new MessageEvent("message", { data }));
  });
}

async function renderEmbed() {
  const { default: EmbedPage } = await import("../page");
  return render(<EmbedPage />);
}

describe("embed postMessage handler", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    vi.resetModules();
  });

  it("accepts a valid set-theme message and updates data-theme", async () => {
    await renderEmbed();
    post({ type: "set-theme", theme: "dark" });
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a message with an unknown type (zod rejects)", async () => {
    await renderEmbed();
    // Component initialises theme to "light" via useEffect; invalid message must not change it
    post({ type: "launch-missiles", target: "everywhere" });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ignores a message with a non-string theme (zod rejects)", async () => {
    await renderEmbed();
    post({ type: "set-theme", theme: 42 });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ignores a null message without throwing", async () => {
    await renderEmbed();
    expect(() => post(null)).not.toThrow();
  });

  it("ignores an invalid theme value (not 'light' | 'dark') — rejects XSS payload", async () => {
    await renderEmbed();
    post({ type: "set-theme", theme: "<script>alert(1)</script>" });
    // Must stay at initialised value; must NOT be the XSS payload
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
