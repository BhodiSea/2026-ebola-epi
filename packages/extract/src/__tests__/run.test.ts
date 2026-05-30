import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { buildExtractionParams, parseExtractionResponse, runExtraction } from "../run.js";
import { extractionTool } from "../tools.js";

const VALID_DOC =
  "As of 2026-05-01, there were 42 confirmed cases of Bundibugyo ebolavirus (1EB20) in the DRC.";

const MOCK_RESPONSE: Pick<Anthropic.Message, "content" | "usage"> = {
  content: [
    {
      type: "tool_use" as const,
      id: "toolu_01",
      name: "extract_case_counts",
      input: { extractions: [] },
    },
  ],
  usage: {
    input_tokens: 100,
    output_tokens: 10,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 80,
    server_tool_use: null,
    service_tier: null,
  },
};

function capturedParams(client: Anthropic): Anthropic.MessageCreateParamsNonStreaming {
  const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0];
  if (call === undefined) {
    throw new Error("no Anthropic call was made");
  }
  return call[0] as Anthropic.MessageCreateParamsNonStreaming;
}

function makeClient() {
  return {
    messages: { create: vi.fn().mockResolvedValue(MOCK_RESPONSE) },
  } as unknown as Anthropic;
}

// ─── buildExtractionParams ────────────────────────────────────────────────────

describe("buildExtractionParams — shape for step.ai.wrap", () => {
  it("returns JSON-serialisable params (no class instances)", () => {
    const params = buildExtractionParams(VALID_DOC);
    expect(() => JSON.stringify(params)).not.toThrow();
  });

  it("tools block cache_control.ttl is '1h' (AGENTS.md Rule 13)", () => {
    const params = buildExtractionParams(VALID_DOC);
    const cc = params.tools?.[0]?.cache_control as
      | null
      | undefined
      | { ttl?: string; type: string };
    expect(cc?.ttl).toBe("1h");
  });

  it("few-shots cache_control has no ttl (5m default)", () => {
    const params = buildExtractionParams(VALID_DOC);
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const cc = (content[0] as { cache_control?: { ttl?: string } }).cache_control;
    expect(cc?.ttl).toBeUndefined();
  });

  it("tool_choice is forced to extract_case_counts", () => {
    const params = buildExtractionParams(VALID_DOC);
    expect(params.tool_choice).toStrictEqual({ type: "tool", name: "extract_case_counts" });
  });

  it("tools[0].name matches extractionTool.name", () => {
    const params = buildExtractionParams(VALID_DOC);
    expect(params.tools?.[0]?.name).toBe(extractionTool.name);
  });

  it("document is wrapped in untrusted XML (prompt-injection defence)", () => {
    const params = buildExtractionParams(VALID_DOC);
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const docBlock = (content[1] as { text?: string }).text ?? "";
    expect(docBlock).toContain('<document trust="untrusted">');
    expect(docBlock).toContain(VALID_DOC);
  });
});

// ─── parseExtractionResponse ──────────────────────────────────────────────────

describe("parseExtractionResponse", () => {
  it("returns rows + toolSchemaHash + usage from a valid response", () => {
    const result = parseExtractionResponse(MOCK_RESPONSE, VALID_DOC);
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("toolSchemaHash");
    expect(result).toHaveProperty("usage");
    expect(result).not.toHaveProperty("promptVersionHash");
  });

  it("throws when response has no tool_use block", () => {
    const bad: Pick<Anthropic.Message, "content" | "usage"> = {
      content: [{ type: "text" as const, text: "prose", citations: null }],
      usage: MOCK_RESPONSE.usage,
    };
    expect(() => parseExtractionResponse(bad, VALID_DOC)).toThrow("no tool_use block");
  });

  it("corrects wrong LLM offsets when quote_text is verbatim in document", () => {
    const quote = "42 confirmed cases of Bundibugyo";
    const correctStart = VALID_DOC.indexOf(quote);
    const response: Pick<Anthropic.Message, "content" | "usage"> = {
      content: [
        {
          type: "tool_use" as const,
          id: "toolu_02",
          name: "extract_case_counts",
          input: {
            extractions: [
              {
                pathogen_icd11: "1EB20",
                country_iso3: "COD",
                metric: "confirmed",
                value: 42,
                as_of: "2026-05-01",
                // wrong offsets — LLM hallucinated 0..5 instead of the real position
                source_quote: { char_start: 0, char_end: 5, quote_text: quote },
              },
            ],
          },
        },
      ],
      usage: MOCK_RESPONSE.usage,
    };
    const result = parseExtractionResponse(response, VALID_DOC);
    expect(result.rows[0]?.source_quote.char_start).toBe(correctStart);
    expect(result.rows[0]?.source_quote.char_end).toBe(correctStart + quote.length);
  });

  it("throws substring_verify_fail when quote_text is not verbatim in document", () => {
    const response: Pick<Anthropic.Message, "content" | "usage"> = {
      content: [
        {
          type: "tool_use" as const,
          id: "toolu_03",
          name: "extract_case_counts",
          input: {
            extractions: [
              {
                pathogen_icd11: "1EB20",
                country_iso3: "COD",
                metric: "confirmed",
                value: 42,
                as_of: "2026-05-01",
                source_quote: { char_start: 0, char_end: 5, quote_text: "NOT IN DOC AT ALL" },
              },
            ],
          },
        },
      ],
      usage: MOCK_RESPONSE.usage,
    };
    expect(() => parseExtractionResponse(response, VALID_DOC)).toThrow("substring_verify_fail");
  });
});

// ─── CANDIDATE_PROMPT_VERSION ────────────────────────────────────────────────

describe("CANDIDATE_PROMPT_VERSION", () => {
  it("is exported as a non-empty string (shadow-run sampler depends on it)", async () => {
    const { CANDIDATE_PROMPT_VERSION } = await import("../run.js");
    expect(typeof CANDIDATE_PROMPT_VERSION).toBe("string");
    expect(CANDIDATE_PROMPT_VERSION.length).toBeGreaterThan(0);
  });

  it("equals computePromptVersionHash() (defaults to production until a real candidate is staged)", async () => {
    const { CANDIDATE_PROMPT_VERSION } = await import("../run.js");
    const { computePromptVersionHash } = await import("../hash.js");
    expect(CANDIDATE_PROMPT_VERSION).toBe(computePromptVersionHash());
  });
});

// ─── runExtraction (legacy wrapper) ──────────────────────────────────────────

describe("runExtraction — Anthropic call params", () => {
  it("tools block cache_control.ttl is '1h' (AGENTS.md Rule 13)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    const cc = capturedParams(client).tools?.[0]?.cache_control as
      | null
      | undefined
      | { ttl?: string; type: string };
    expect(cc?.ttl).toBe("1h");
  });

  it("few-shots cache_control has no ttl (5m default)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    const content = capturedParams(client).messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const cc = (content[0] as { cache_control?: { ttl?: string } }).cache_control;
    expect(cc?.ttl).toBeUndefined();
  });

  it("tool_choice is forced to extract_case_counts", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    expect(capturedParams(client).tool_choice).toStrictEqual({
      type: "tool",
      name: "extract_case_counts",
    });
  });

  it("tools[0].name matches extractionTool.name", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    expect(capturedParams(client).tools?.[0]?.name).toBe(extractionTool.name);
  });
});
