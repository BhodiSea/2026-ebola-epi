/* eslint-disable @typescript-eslint/naming-convention */
import type Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, z } from "zod/v4";

import { PATHOGEN_ICD11 } from "./icd11.js";

// PATHOGEN_ICD11 is a compile-time const with 7 hardcoded entries — never empty at runtime
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const PATHOGEN_ICD11_VALUES = Object.values(PATHOGEN_ICD11) as [string, ...string[]];

export const ExtractionRowSchema = z.object({
  pathogen_icd11: z.enum(PATHOGEN_ICD11_VALUES),
  country_iso3: z.string().length(3),
  // Most specific geographic name the document provides: zone de santé preferred,
  // province/region as fallback when zone is not named.
  admin_name: z.string().min(1).optional(),
  metric: z.enum([
    "cases",
    "deaths",
    "suspected",
    "confirmed",
    "probable",
    "vaccinated",
    "contacts",
    "healthcare_workers",
    "hcw_deaths",
    "nosocomial",
    "lab_positive",
    "in_treatment",
  ]),
  value: z.number().int().nonnegative(),
  as_of: z.iso.date(),
  // true = value is new since previous sitrep; false/absent = cumulative
  is_new_in_period: z.boolean().optional(),
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
