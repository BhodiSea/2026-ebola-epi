/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";

import { MODEL_HAIKU } from "../models.js";
import type { ExtractionUsage } from "../run.js";
import { TRIAGE_FEW_SHOTS, TRIAGE_SYSTEM } from "./triage-prompt.js";
import type { TriageOutput } from "./triage-tool.js";
import { TriageOutputSchema, triageTool } from "./triage-tool.js";

export interface TriageResult {
  promptVersionHash: string;
  triage: TriageOutput;
  usage: ExtractionUsage;
}

/**
 * Build Anthropic message params for the Triage Agent.
 * model defaults to MODEL_HAIKU; pass MODEL_SONNET for the low-confidence second pass.
 * The tools+system block carries a 1h TTL cache breakpoint (AGENTS.md Rule 13).
 */
export function buildTriageParams(
  documentText: string,
  model: string = MODEL_HAIKU,
): Anthropic.MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 512,
    tools: [
      {
        name: triageTool.name,
        description: triageTool.description,
        input_schema: triageTool.input_schema,
        // @ts-expect-error: SDK 0.52 types omit ttl; AGENTS.md Rule 13 requires explicit 1h
        cache_control: { type: "ephemeral", ttl: "1h" },
      },
    ],
    system: TRIAGE_SYSTEM,
    messages: buildTriageMessages(documentText),
    tool_choice: { type: "tool", name: "classify_document" },
  };
}

/**
 * Parse the raw Anthropic response and apply the discriminated-union validation.
 * Throws if the tool_use block is missing or the output fails schema validation.
 */
export function parseTriageResponse(
  response: Pick<Anthropic.Message, "content" | "usage">,
): Omit<TriageResult, "promptVersionHash"> {
  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (toolUse?.type !== "tool_use") {
    throw new Error("no tool_use block in triage response");
  }
  // Apply discriminated-union validation post-call (flat tool input → strict output type)
  const triage = TriageOutputSchema.parse(toolUse.input);
  return { triage, usage: response.usage };
}

function buildTriageMessages(documentText: string): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: [
        { type: "text", text: TRIAGE_FEW_SHOTS, cache_control: { type: "ephemeral" } },
        { type: "text", text: `<document trust="untrusted">\n${documentText}\n</document>` },
      ],
    },
  ];
}

export type { TriageOutput } from "./triage-tool.js";
