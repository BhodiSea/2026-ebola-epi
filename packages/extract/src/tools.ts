/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, z } from "zod/v4";

export const ExtractionRowSchema = z.object({
  pathogen_icd11: z
    .string()
    .regex(/^[A-Z0-9.]+$/)
    .min(4)
    .max(12),
  country_iso3: z.string().length(3),
  admin1_name: z.string().min(1).optional(),
  metric: z.enum([
    "cases",
    "deaths",
    "suspected",
    "confirmed",
    "probable",
    "vaccinated",
    "contacts",
  ]),
  value: z.number().int().nonnegative(),
  as_of: z.iso.date(),
  source_quote: z.object({
    char_start: z.number().int().nonnegative(),
    char_end: z.number().int().positive(),
    quote_text: z.string().min(1),
  }),
});

export type ExtractionRow = z.infer<typeof ExtractionRowSchema>;

export const ExtractionBatchSchema = z.object({
  extractions: z.array(ExtractionRowSchema),
});

type AnthropicInputSchema = Anthropic.Tool["input_schema"];

// toJSONSchema(z.object()) always produces a type:"object" schema — structurally safe
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const inputSchema = toJSONSchema(ExtractionBatchSchema) as AnthropicInputSchema;

export const extractionTool: {
  readonly description: string;
  readonly input_schema: AnthropicInputSchema;
  readonly name: string;
} = {
  description:
    "Extract all epidemiological figures from this document as a structured array. Call once with all figures found.",
  input_schema: inputSchema,
  name: "extract_case_counts",
};
