import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockGetUser, mockIsInternalUser, mockEnv, mockFetch } = vi.hoisted(() => {
  const getUser = vi.fn();
  const isInternalUser = vi.fn();
  const fetch = vi.fn();
  const env: { INNGEST_API_KEY: string | undefined; INNGEST_SIGNING_KEY: string } = {
    INNGEST_API_KEY: "test-api-key",
    INNGEST_SIGNING_KEY: "test-signing-key",
  };
  return {
    mockGetUser: getUser,
    mockIsInternalUser: isInternalUser,
    mockFetch: fetch,
    mockEnv: env,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));
vi.mock("@/lib/auth/internal-user", () => ({
  isInternalUser: mockIsInternalUser,
}));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

vi.stubGlobal("fetch", mockFetch);

const INTERNAL_USER = { id: "usr_1", email: "admin@test.com", app_metadata: { role: "admin" } };
const VALID_EVENT_ID = "evt-valid-test-id";

function makeCtx(eventId: string) {
  return { params: Promise.resolve({ eventId }) };
}
function makeReq(eventId: string) {
  return new Request(`http://localhost:3000/api/internal/ingest-runs/${eventId}`);
}

describe("GET /api/internal/ingest-runs/[eventId]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when no user is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockIsInternalUser.mockReturnValue(false);
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(403);
  });

  it("returns 403 when user is not an internal user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "usr_2", app_metadata: { role: "viewer" } } },
    });
    mockIsInternalUser.mockReturnValue(false);
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(403);
  });

  it("returns 400 for an eventId containing path-traversal characters", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    const { GET } = await import("../route");
    const res = await GET(makeReq("../../../etc/passwd"), makeCtx("../../../etc/passwd"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty eventId", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    const { GET } = await import("../route");
    const res = await GET(makeReq(""), makeCtx(""));
    expect(res.status).toBe(400);
  });

  it("returns 502 when the Inngest API responds with a non-200 status", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    mockFetch.mockResolvedValue(new Response(null, { status: 401 }));
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(502);
  });

  it("includes upstreamStatus in the 502 body and x-upstream-status header", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(502);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any */
    const body = await res.json();
    expect(body.upstreamStatus).toBe(401);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    expect(res.headers.get("x-upstream-status")).toBe("401");
  });

  it("returns 200 with the runs array from Inngest on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    const inngestRuns = [
      {
        run_id: "run_abc123",
        status: "Completed",
        function_id: "ingest/who-don.poll",
        started_at: "2026-06-01T10:00:00Z",
        ended_at: "2026-06-01T10:01:00Z",
      },
    ];
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: inngestRuns }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(200);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any; safe-assertion idiom for test assertions */
    const body = await res.json();
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].run_id).toBe("run_abc123");
    expect(body.runs[0].status).toBe("Completed");
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });

  it("sends the Authorization header with the Inngest API key (not the signing key)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const { GET } = await import("../route");
    await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.inngest.com/v1/events/${VALID_EVENT_ID}/runs`,
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() returns any; standard vitest pattern for partial-match assertions
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
      }),
    );
  });

  it("returns 502 when INNGEST_API_KEY is not configured", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    mockEnv.INNGEST_API_KEY = undefined;
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(502);
    mockEnv.INNGEST_API_KEY = "test-api-key";
  });

  it("returns empty runs array when Inngest body has no data field", async () => {
    mockGetUser.mockResolvedValue({ data: { user: INTERNAL_USER } });
    mockIsInternalUser.mockReturnValue(true);
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    const { GET } = await import("../route");
    const res = await GET(makeReq(VALID_EVENT_ID), makeCtx(VALID_EVENT_ID));
    expect(res.status).toBe(200);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any */
    const body = await res.json();
    expect(body.runs).toEqual([]);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });
});
