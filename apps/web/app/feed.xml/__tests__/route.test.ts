import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /feed.xml", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@/lib/supabase/server");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Supabase SupabaseClient<Database> generics too deep for vitest mock literal
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as never);
  });

  it("exports a GET handler", async () => {
    const mod = await import("../route");
    expect(typeof mod.GET).toBe("function");
  });

  it("returns a Response with application/atom+xml content-type", async () => {
    const { GET } = await import("../route");
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/atom+xml");
  });

  it("returns valid XML with feed root element", async () => {
    const { GET } = await import("../route");
    const response = await GET();
    const text = await response.text();
    expect(text).toContain("<feed");
    expect(text).toContain("</feed>");
  });

  it("includes a summary element in entries when documents have full_text", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Supabase SupabaseClient<Database> generics too deep for vitest mock literal
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "abc",
                  title: "Test Doc",
                  url: "https://example.com",
                  published_at: "2026-05-01T00:00:00Z",
                  ingested_at: "2026-05-01T00:00:00Z",
                  full_text: "Confirmed cases rose to 142 in Irumu health zone.",
                  source: [{ slug: "who-don", name: "WHO DON" }],
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { GET } = await import("../route");
    const response = await GET();
    const text = await response.text();
    expect(text).toContain("<summary");
  });

  it("parses as valid XML with a feed root and entries that each have a link", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Supabase SupabaseClient<Database> generics too deep for vitest mock literal
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "doc-1",
                  title: "Sitrep #1",
                  url: "https://example.com/1",
                  published_at: "2026-05-01T00:00:00Z",
                  ingested_at: "2026-05-01T00:00:00Z",
                  full_text: null,
                  source: [{ slug: "who-don", name: "WHO DON" }],
                },
                {
                  id: "doc-2",
                  title: "Sitrep #2",
                  url: "https://example.com/2",
                  published_at: "2026-05-02T00:00:00Z",
                  ingested_at: "2026-05-02T00:00:00Z",
                  full_text: null,
                  source: [{ slug: "who-afro", name: "WHO AFRO" }],
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const { GET } = await import("../route");
    const response = await GET();
    const text = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "application/xml");

    // Must not be an XML parse error document
    expect(doc.querySelector("parsererror")).toBeNull();

    const feedRoot = doc.querySelector("feed");
    expect(feedRoot).not.toBeNull();

    const entries = doc.querySelectorAll("entry");
    expect(entries.length).toBe(2);

    for (const entry of entries) {
      const link = entry.querySelector("link");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toContain("/document/");
    }
  });
});
