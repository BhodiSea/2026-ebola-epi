import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@vercel/og", () => ({
  ImageResponse: vi.fn(
    (element: React.ReactElement) =>
      new Response(JSON.stringify(element), {
        headers: { "content-type": "image/png" },
      }),
  ),
}));

vi.mock("@/lib/og/fonts", () => ({
  getOgFonts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/og/severity-badge", () => ({
  SeverityBadge: () => null,
}));

vi.mock("@/lib/og/wordmark", () => ({
  Wordmark: () => null,
}));

describe("EvidenceOgImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Source Serif 4 italic on the quote element", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                verbatim_text: "Confirmed cases rose to 142 in Irumu health zone.",
                severity: "high",
                source: [{ name: "WHO DON" }],
              },
            }),
          }),
        }),
      }),
    } as never);

    const { default: EvidenceOgImage } = await import("../opengraph-image");
    const response = await EvidenceOgImage({
      params: Promise.resolve({ "quote-id": "test-id" }),
    });

    const body = await response.text();
    const tree = JSON.parse(body);

    type Node = Record<string, unknown>;

    function nodeStyle(node: Node): null | Record<string, unknown> {
      const props = node.props;
      if (typeof props !== "object" || props === null) {
        return null;
      }
      const style = (props as Node).style;
      if (typeof style !== "object" || style === null) {
        return null;
      }
      return style as Record<string, unknown>;
    }

    function nodeChildren(node: Node): Node[] {
      const props = node.props as Node | undefined;
      const children = props === undefined ? undefined : props.children;
      if (!Array.isArray(children)) {
        return [];
      }
      return children.filter((c): c is Node => typeof c === "object" && c !== null);
    }

    function findItalicElement(node: Node): Node | null {
      const style = nodeStyle(node);
      if (style?.fontStyle === "italic") {
        return node;
      }
      for (const child of nodeChildren(node)) {
        const found = findItalicElement(child);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const quoteEl = findItalicElement(tree as Node);
    expect(quoteEl).not.toBeNull();
    const style = (
      quoteEl === null ? {} : ((quoteEl.props as Record<string, unknown>).style ?? {})
    ) as Record<string, unknown>;
    expect(style.fontFamily).toBe("Source Serif 4");
  });

  it("renders without crashing when supabase returns null", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    } as never);

    const { default: EvidenceOgImage } = await import("../opengraph-image");
    const response = await EvidenceOgImage({
      params: Promise.resolve({ "quote-id": "missing-id" }),
    });
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
