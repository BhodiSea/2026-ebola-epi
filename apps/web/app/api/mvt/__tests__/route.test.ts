import { describe, expect, it, vi } from "vitest";

import { GET } from "../[v]/[z]/[x]/[y]/route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function makeCtx(seg: { v: string; x: string; y: string; z: string }) {
  return {
    params: Promise.resolve(seg),
  };
}

const ZONE_CTX = { v: "zones_v1", z: "6", x: "32", y: "32" };

function makeRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`);
}

describe("GET /api/mvt/[v]/[z]/[x]/[y]", () => {
  it("returns application/x-protobuf content-type on success", async () => {
    const mockBytes = new Uint8Array([26, 43]).buffer;
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: mockBytes, error: null }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/x-protobuf");
  });

  it("returns immutable Cache-Control header", async () => {
    const mockBytes = new Uint8Array([0x00]).buffer;
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: mockBytes, error: null }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=604800");
  });

  it("forwards outbreak_id query param to rpc", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: new Uint8Array().buffer, error: null });
    vi.mocked(createClient).mockResolvedValue({
      rpc: rpcMock,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const outbreakId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
    await GET(
      makeRequest(`/api/mvt/zones_v1/6/32/32?outbreak_id=${outbreakId}`),
      makeCtx(ZONE_CTX),
    );

    expect(rpcMock).toHaveBeenCalledWith(
      "mvt",
      expect.objectContaining({ outbreak_id: outbreakId }),
    );
  });

  it("returns 500 with a generic message (no DB internals) on Supabase RPC failure", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "db exploded: schema leak" } }),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET(makeRequest("/api/mvt/zones_v1/6/32/32"), makeCtx(ZONE_CTX));

    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).not.toContain("db exploded");
  });

  it("returns 400 for non-numeric tile coordinates", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET(
      makeRequest("/api/mvt/zones_v1/abc/32/32"),
      makeCtx({ ...ZONE_CTX, z: "abc" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for tile coordinates out of range for the zoom level", async () => {
    const rpc = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      rpc,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    // at z=6 the valid x/y range is 0..63; 64 = 2^6 is just past it
    const res = await GET(
      makeRequest("/api/mvt/zones_v1/6/64/0"),
      makeCtx({ ...ZONE_CTX, x: "64", y: "0" }),
    );
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown tile version (never serves live data under a stale version)", async () => {
    const rpc = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      rpc,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await GET(
      makeRequest("/api/mvt/zones_v0/6/32/32"),
      makeCtx({ ...ZONE_CTX, v: "zones_v0" }),
    );
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
