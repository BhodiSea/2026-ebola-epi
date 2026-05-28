export const STATIC_INSTRUCTIONS = `You extract epidemiological case counts from outbreak situation reports.
Rules:
- Only extract figures explicitly stated in the document.
- char_start and char_end are zero-indexed character offsets of quote_text within the document text. Offsets are relative to the plain document text content, not any surrounding XML or HTML tags.
- quote_text must be the verbatim substring at [char_start, char_end). No paraphrasing.
- Call extract_case_counts ONCE with ALL figures found as the extractions array.
- Each extraction must have pathogen_icd11, country_iso3, metric, value, as_of, and source_quote.
- If a figure is absent or ambiguous, do not include it.`;

export const FEW_SHOTS = `Example document: "As of 15 March 2026, 42 confirmed cases and 12 deaths have been reported."
Example call: extract_case_counts({ extractions: [
  { pathogen_icd11: "1D60.00", country_iso3: "COD", metric: "confirmed", value: 42, as_of: "2026-03-15",
    source_quote: { char_start: 21, char_end: 53, quote_text: "42 confirmed cases and 12 deaths" } },
  { pathogen_icd11: "1D60.00", country_iso3: "COD", metric: "deaths", value: 12, as_of: "2026-03-15",
    source_quote: { char_start: 21, char_end: 53, quote_text: "42 confirmed cases and 12 deaths" } }
]})`;
