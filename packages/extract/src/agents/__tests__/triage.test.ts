import { describe, expect, it } from "vitest";

import { MODEL_HAIKU, MODEL_SONNET } from "../..";
import { buildTriageParams, parseTriageResponse } from "../triage.js";

describe("buildTriageParams", () => {
  it("uses MODEL_HAIKU by default", () => {
    const params = buildTriageParams("sample text");
    expect(params.model).toBe(MODEL_HAIKU);
  });

  it("accepts MODEL_SONNET for second-pass low-confidence re-route", () => {
    const params = buildTriageParams("sample text", MODEL_SONNET);
    expect(params.model).toBe(MODEL_SONNET);
  });

  it("sets cache_control ttl:'1h' on the tool (AGENTS.md Rule 13)", () => {
    const params = buildTriageParams("sample text");
    const tool = params.tools?.[0];
    // @ts-expect-error: SDK 0.52 types CacheControlEphemeral without ttl; AGENTS.md Rule 13 requires explicit 1h
    expect(tool?.cache_control.ttl).toBe("1h");
  });

  it("forces tool_choice to classify_document", () => {
    const params = buildTriageParams("sample text");
    expect(params.tool_choice).toMatchObject({ type: "tool", name: "classify_document" });
  });

  it("wraps document in untrusted XML tag (prompt injection defence)", () => {
    const params = buildTriageParams("the actual text");
    const messages = params.messages;
    const lastContent = messages[0]?.content;
    const docBlock = Array.isArray(lastContent)
      ? lastContent.find(
          (b) =>
            typeof b === "object" && "text" in b && b.text.includes('<document trust="untrusted">'),
        )
      : null;
    expect(docBlock).toBeTruthy();
  });

  it("has exactly one tool named classify_document", () => {
    const params = buildTriageParams("sample text");
    expect(params.tools).toHaveLength(1);
    expect(params.tools?.[0]?.name).toBe("classify_document");
  });
});

describe("parseTriageResponse — is_outbreak:false branch", () => {
  it("parses a valid non-outbreak tool_use response", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t1",
          name: "classify_document",
          input: { is_outbreak: false, novelty: "known", confidence: 0.95 },
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    const result = parseTriageResponse(mockResponse);
    expect(result.triage.is_outbreak).toBe(false);
    expect(result.triage.novelty).toBe("known");
    expect(result.triage.confidence).toBe(0.95);
  });
});

describe("parseTriageResponse — is_outbreak:true branch", () => {
  it("parses a valid outbreak tool_use response including pathogen and country", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t2",
          name: "classify_document",
          input: {
            is_outbreak: true,
            novelty: "known",
            confidence: 0.88,
            pathogen_icd11: "1D60.2",
            country_iso3: "COD",
          },
        },
      ],
      usage: {
        input_tokens: 120,
        output_tokens: 25,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    const result = parseTriageResponse(mockResponse);
    expect(result.triage.is_outbreak).toBe(true);
    if (!result.triage.is_outbreak) {
      throw new Error("is_outbreak must be true");
    }
    expect(result.triage.pathogen_icd11).toBe("1D60.2");
    expect(result.triage.country_iso3).toBe("COD");
  });

  it("throws when is_outbreak:true but pathogen_icd11 is missing", () => {
    const mockResponse = {
      content: [
        {
          type: "tool_use" as const,
          id: "t3",
          name: "classify_document",
          input: { is_outbreak: true, novelty: "new", confidence: 0.9, country_iso3: "COD" },
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    expect(() => parseTriageResponse(mockResponse)).toThrow();
  });
});

describe("parseTriageResponse — error cases", () => {
  it("throws when no tool_use block in response", () => {
    const mockResponse = {
      content: [{ type: "text" as const, text: "Sorry I cannot classify", citations: null }],
      usage: {
        input_tokens: 50,
        output_tokens: 10,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        server_tool_use: null,
        service_tier: null,
      },
    };
    expect(() => parseTriageResponse(mockResponse)).toThrow("no tool_use block");
  });
});
