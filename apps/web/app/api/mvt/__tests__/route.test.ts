import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "../[v]/[z]/[x]/[y]/route";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  },
}));

function makeCtx(seg: { v: string; x: string; y: string; z: string }) {
  return { params: Promise.resolve(seg) };
}

const ZONE_CTX = { v: "zones_v1", x: "32", y: "32", z: "6" };

function makeRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`);
}

describe("GET /api/mvt/[v]/[z]/[x]/[y]", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns application/x-protobuf content-type on success", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([26, 43])));

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/x-protobuf");
  });

  it("returns immutable Cache-Control header", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([0x00])));

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=604800");
  });

  it("sends Accept: application/octet-stream to PostgREST", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([26])));

    await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rpc/mvt"),
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect matchers are typed as any
        headers: expect.objectContaining({ Accept: "application/octet-stream" }),
      }),
    );
  });

  it("forwards outbreak_id in request body to PostgREST", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([26])));

    const outbreakId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
    await GET(
      makeRequest(`/api/mvt/zones_v1/6/32/32?outbreak_id=${outbreakId}`),
      makeCtx(ZONE_CTX),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rpc/mvt"),
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect matchers are typed as any
        body: expect.stringContaining(outbreakId),
      }),
    );
  });

  it("returns 204 when PostgREST returns 204 (empty tile)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(204);
  });

  it("returns 204 when PostgREST returns zero-length body", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(0)));

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(204);
  });

  it("returns 500 with a generic message (no DB internals) on PostgREST failure", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "db exploded: schema leak" }), { status: 500 }),
    );

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain("db exploded");
  });

  it("returns 400 for non-numeric tile coordinates", async () => {
    const res = await GET(
      makeRequest("/api/mvt/zones_v1/abc/32/32"),
      makeCtx({ ...ZONE_CTX, z: "abc" }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for tile coordinates out of range for the zoom level", async () => {
    // at z=6 the valid x/y range is 0..63; 64 = 2^6 is just past it
    const res = await GET(
      makeRequest("/api/mvt/zones_v1/6/64/0"),
      makeCtx({ ...ZONE_CTX, x: "64", y: "0" }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown tile version (never serves live data under a stale version)", async () => {
    const res = await GET(
      makeRequest("/api/mvt/zones_v0/6/32/32"),
      makeCtx({ ...ZONE_CTX, v: "zones_v0" }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
