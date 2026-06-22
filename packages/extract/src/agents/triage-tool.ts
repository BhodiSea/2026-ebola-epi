/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, z } from "zod/v4";

// Flat-object input schema for the Anthropic tool — Anthropic requires type:"object" at
// the top level; discriminated unions produce anyOf which is rejected. The discriminated
// validation happens in parseTriageResponse via TriageOutputSchema.parse().
export const TriageInputSchema = z.object({
  is_outbreak: z.boolean(),
  novelty: z.enum(["known", "new"]),
  confidence: z.number().min(0).max(1),
  pathogen_icd11: z
    .string()
    .regex(/^[A-Z0-9.]+$/)
    .optional(),
  country_iso3: z.string().length(3).optional(),
});

// Discriminated-union schema applied post-call to enforce that pathogen_icd11 and
// country_iso3 are present when is_outbreak:true.
const TriageBase = z.object({
  novelty: z.enum(["known", "new"]),
  confidence: z.number().min(0).max(1),
});
export const TriageOutputSchema = z.discriminatedUnion("is_outbreak", [
  TriageBase.extend({ is_outbreak: z.literal(false) }),
  TriageBase.extend({
    is_outbreak: z.literal(true),
    pathogen_icd11: z.string().regex(/^[A-Z0-9.]+$/),
    country_iso3: z.string().length(3),
  }),
]);

export type TriageOutput = z.infer<typeof TriageOutputSchema>;

type AnthropicInputSchema = Anthropic.Tool["input_schema"];

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const inputSchema = toJSONSchema(TriageInputSchema) as AnthropicInputSchema;

export const triageTool: {
  readonly description: string;
  readonly input_schema: AnthropicInputSchema;
  readonly name: string;
} = {
  name: "classify_document",
  description:
    "Classify whether this document reports an active disease outbreak. " +
    "Set is_outbreak:true only for confirmed or strongly suspected active outbreaks. " +
    "When is_outbreak:true, pathogen_icd11 (ICD-11 coded entity, e.g. 1D60.2 for Bundibugyo virus disease) and " +
    "country_iso3 (ISO 3166-1 alpha-3) are required.",
  input_schema: inputSchema,
};
