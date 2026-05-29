import { describe, expect, it } from "vitest";

import { computeReconcilePromptHash, MODEL_OPUS } from "../..";
import { buildReconcileParams, parseReconcileResponse } from "../reconcile.js";
import { shouldReconcile } from "../shared.js";

const HEX_16 = /^[0-9a-f]{16}$/;

describe("computeReconcilePromptHash", () => {
  it("returns a 16-char lowercase hex string", () => {
    expect(computeReconcilePromptHash()).toMatch(HEX_16);
  });

  it("is deterministic — must be stable so audit rows can be correlated with prompt versions", () => {
    expect(computeReconcilePromptHash()).toBe(computeReconcilePromptHash());
  });
});

const ROW_A_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_B_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const BASE_INPUT = {
  a: {
    id: ROW_A_ID,
    value: 142,
    trustScore: "1.00",
    publishedAtIso: "2026-05-27T12:00:00Z",
    quoteText: "142 confirmed cases as of 27 May 2026",
    sourceSlug: "who-don",
  },
  b: {
    id: ROW_B_ID,
    value: 108,
    trustScore: "0.90",
    publishedAtIso: "2026-05-23T09:00:00Z",
    quoteText: "108 confirmed as of 23 May 2026",
    sourceSlug: "ecdc-cdtr",
  },
  metric: "cases",
  asOf: "2026-05-27",
};

describe("shouldReconcile — reconcile agent threshold", () => {
  it("142 vs 108 triggers reconciliation (exit-gate values)", () => {
    expect(shouldReconcile(142, 108)).toBe(true);
  });

  it("100 vs 80 triggers reconciliation (25% threshold)", () => {
    expect(shouldReconcile(100, 80)).toBe(true);
  });

  it("100 vs 90 does not trigger reconciliation (11% difference)", () => {
    expect(shouldReconcile(100, 90)).toBe(false);
  });
});

describe("buildReconcileParams", () => {
  it("uses MODEL_OPUS", () => {
    const params = buildReconcileParams(BASE_INPUT);
    expect(params.model).toBe(MODEL_OPUS);
  });

  it("sets cache_control ttl:'1h' on the tool (AGENTS.md Rule 13)", () => {
    const params = buildReconcileParams(BASE_INPUT);
    const tool = params.tools?.[0];
    // @ts-expect-error: SDK 0.52 types CacheControlEphemeral without ttl; AGENTS.md Rule 13 requires explicit 1h
    expect(tool?.cache_control.ttl).toBe("1h");
  });

  it("forces tool_choice to resolve_conflict", () => {
    const params = buildReconcileParams(BASE_INPUT);
    expect(params.tool_choice).toMatchObject({ type: "tool", name: "resolve_conflict" });
  });

  it("embeds both candidate IDs in the user message", () => {
    const params = buildReconcileParams(BASE_INPUT);
    const content = params.messages[0]?.content;
    const text = Array.isArray(content)
      ? content.map((b) => (typeof b === "object" && "text" in b ? b.text : "")).join("\n")
      : "";
    expect(text).toContain(ROW_A_ID);
    expect(text).toContain(ROW_B_ID);
  });
});

describe("parseReconcileResponse", () => {
  it("parses a valid winner/loser response", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t1",
          name: "resolve_conflict",
          input: {
            winner_id: ROW_A_ID,
            loser_id: ROW_B_ID,
            reason: "WHO DON is more recent and higher trust",
            confidence: 0.95,
            escalate: false,
          },
        },
      ],
      usage: {
        input_tokens: 300,
        output_tokens: 50,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    const result = parseReconcileResponse(mockResponse, BASE_INPUT);
    expect(result.decision.winner_id).toBe(ROW_A_ID);
    expect(result.decision.loser_id).toBe(ROW_B_ID);
    expect(result.decision.escalate).toBe(false);
  });

  it("sets escalate:true when confidence < 0.8 even if model returned false", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t2",
          name: "resolve_conflict",
          input: {
            winner_id: ROW_A_ID,
            loser_id: ROW_B_ID,
            reason: "Slight advantage to A",
            confidence: 0.72,
            escalate: false,
          },
        },
      ],
      usage: {
        input_tokens: 300,
        output_tokens: 50,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    const result = parseReconcileResponse(mockResponse, BASE_INPUT);
    expect(result.decision.escalate).toBe(true);
  });

  it("throws when winner_id is not in candidate set", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t3",
          name: "resolve_conflict",
          input: {
            winner_id: "00000000-0000-4000-8000-000000000000",
            loser_id: ROW_B_ID,
            reason: "hallucinated id",
            confidence: 0.9,
            escalate: false,
          },
        },
      ],
      usage: {
        input_tokens: 200,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    expect(() => parseReconcileResponse(mockResponse, BASE_INPUT)).toThrow("not in candidate set");
  });

  it("throws when no tool_use block", () => {
    const mockResponse = {
      content: [{ type: "text" as const, text: "I cannot determine the winner", citations: null }],
      usage: {
        input_tokens: 100,
        output_tokens: 10,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    expect(() => parseReconcileResponse(mockResponse, BASE_INPUT)).toThrow("no tool_use block");
  });
});
