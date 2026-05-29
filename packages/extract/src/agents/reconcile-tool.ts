/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, z } from "zod/v4";

export const ReconcileOutputSchema = z.object({
  winner_id: z.uuid(),
  loser_id: z.uuid(),
  reason: z.string().min(1),
  // Opus confidence in its own ranking. If < 0.8, escalate is set to true.
  confidence: z.number().min(0).max(1),
  escalate: z.boolean(),
});

export type ReconcileOutput = z.infer<typeof ReconcileOutputSchema>;

type AnthropicInputSchema = Anthropic.Tool["input_schema"];

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const inputSchema = toJSONSchema(ReconcileOutputSchema) as AnthropicInputSchema;

export const reconcileTool: {
  readonly description: string;
  readonly input_schema: AnthropicInputSchema;
  readonly name: string;
} = {
  name: "resolve_conflict",
  description:
    "Given two conflicting case-count values for the same outbreak/metric/date from different " +
    "sources, determine which is more authoritative. Set winner_id to the more reliable value " +
    "and loser_id to the less reliable one. Set escalate:true and confidence < 0.8 if you " +
    "cannot rank with high confidence.",
  input_schema: inputSchema,
};
