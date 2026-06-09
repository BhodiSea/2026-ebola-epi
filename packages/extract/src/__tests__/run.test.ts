import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { computeCandidatePromptVersionHash, computePromptVersionHash } from "../hash.js";
import { CANDIDATE_STATIC_INSTRUCTIONS } from "../prompt.js";
import {
  buildExtractionParams,
  CANDIDATE_PROMPT_VERSION,
  parseExtractionResponse,
  runExtraction,
} from "../run.js";
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- narrowing SDK fn type to Mock for test call introspection
  const call = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0];
  if (call === undefined) {
    throw new Error("no Anthropic call was made");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- mock.calls[0] is any[] for overloaded SDK fn; shape is known from makeClient
  return call[0] as Anthropic.MessageCreateParamsNonStreaming;
}

function makeClient() {
  const mock = {
    messages: { create: vi.fn().mockResolvedValue(MOCK_RESPONSE) },
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- structural mock of Anthropic class; only messages.create is exercised by tests
  return mock as unknown as Anthropic;
}

// ─── buildExtractionParams ────────────────────────────────────────────────────

describe("buildExtractionParams — shape for step.ai.wrap", () => {
  it("returns JSON-serialisable params (no class instances)", () => {
    const params = buildExtractionParams(VALID_DOC);
    expect(() => JSON.stringify(params)).not.toThrow();
  });

  it("tools block cache_control.ttl is '1h' (AGENTS.md Rule 13)", () => {
    const params = buildExtractionParams(VALID_DOC);
    expect(JSON.stringify(params.tools?.[0]?.cache_control)).toContain('"ttl":"1h"');
  });

  it("few-shots cache_control has no ttl (5m default)", () => {
    const params = buildExtractionParams(VALID_DOC);
    const content = params.messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const block = content[0];
    if (block?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(JSON.stringify(block.cache_control)).not.toContain('"ttl"');
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
    const docBlock = content[1];
    if (docBlock?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(docBlock.text).toContain('<document trust="untrusted">');
    expect(docBlock.text).toContain(VALID_DOC);
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
                pathogen_icd11: "1D60.2",
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
                pathogen_icd11: "1D60.2",
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

  it("silently drops rows with unknown ICD-11 codes rather than failing the batch", () => {
    // Regression: model once emitted 1D60.00 (hallucinated sub-code) creating phantom outbreaks.
    const response: Pick<Anthropic.Message, "content" | "usage"> = {
      content: [
        {
          type: "tool_use" as const,
          id: "toolu_04",
          name: "extract_case_counts",
          input: {
            extractions: [
              {
                pathogen_icd11: "1D60.00", // hallucinated — should be dropped
                country_iso3: "COD",
                metric: "confirmed",
                value: 10,
                as_of: "2026-05-01",
                source_quote: { char_start: 0, char_end: 5, quote_text: "As of" },
              },
              {
                pathogen_icd11: "1D60.2", // valid — should survive
                country_iso3: "COD",
                metric: "deaths",
                value: 3,
                as_of: "2026-05-01",
                source_quote: { char_start: 0, char_end: 5, quote_text: "As of" },
              },
            ],
          },
        },
      ],
      usage: MOCK_RESPONSE.usage,
    };
    const result = parseExtractionResponse(response, VALID_DOC);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.pathogen_icd11).toBe("1D60.2");
  });
});

// ─── CANDIDATE_PROMPT_VERSION ────────────────────────────────────────────────

describe("CANDIDATE_PROMPT_VERSION", () => {
  it("is exported as a non-empty string (shadow-run sampler depends on it)", () => {
    expect(typeof CANDIDATE_PROMPT_VERSION).toBe("string");
    expect(CANDIDATE_PROMPT_VERSION.length).toBeGreaterThan(0);
  });

  it("equals computeCandidatePromptVersionHash() (WS3: a real candidate is staged)", () => {
    expect(CANDIDATE_PROMPT_VERSION).toBe(computeCandidatePromptVersionHash());
  });

  it("differs from computePromptVersionHash() (candidate and production are distinct)", () => {
    expect(CANDIDATE_PROMPT_VERSION).not.toBe(computePromptVersionHash());
  });
});

describe("buildExtractionParams — variant: candidate selects candidate system prompt", () => {
  it("system text is CANDIDATE_STATIC_INSTRUCTIONS when variant is 'candidate'", () => {
    const params = buildExtractionParams(VALID_DOC, "candidate");
    expect(params.system).toBe(CANDIDATE_STATIC_INSTRUCTIONS);
  });
});

// ─── runExtraction (legacy wrapper) ──────────────────────────────────────────

describe("runExtraction — Anthropic call params", () => {
  it("tools block cache_control.ttl is '1h' (AGENTS.md Rule 13)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    expect(JSON.stringify(capturedParams(client).tools?.[0]?.cache_control)).toContain(
      '"ttl":"1h"',
    );
  });

  it("few-shots cache_control has no ttl (5m default)", async () => {
    const client = makeClient();
    await runExtraction(client, "test document");
    const content = capturedParams(client).messages[0]?.content;
    if (!Array.isArray(content)) {
      throw new TypeError("expected array user content");
    }
    const block = content[0];
    if (block?.type !== "text") {
      throw new TypeError("expected text block");
    }
    expect(JSON.stringify(block.cache_control)).not.toContain('"ttl"');
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
