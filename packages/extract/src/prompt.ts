export const STATIC_INSTRUCTIONS = `You extract epidemiological data from outbreak situation reports.

Rules:
- Only extract figures explicitly stated in the document.
- char_start and char_end are zero-indexed character offsets of quote_text within the document text (not HTML/XML tags). quote_text must be the verbatim substring at [char_start, char_end). No paraphrasing.
- Call extract_case_counts ONCE with ALL figures found.
- Required per extraction: pathogen_icd11, country_iso3, metric, value, as_of, source_quote.
- admin_name: provide the MOST SPECIFIC geographic name the document states — use the zone de santé (health zone) name when named (e.g. "Rwampara", "Mongbwalu", "Bunia"), fall back to province/region name only when no zone is named.
- is_new_in_period: true when the document explicitly says "new" or "since the last report"; omit or false for cumulative totals.
- Metrics: cases, deaths, suspected, confirmed, probable, vaccinated, contacts, healthcare_workers (total HCW cases), hcw_deaths (HCW fatalities), nosocomial (hospital-acquired cases), lab_positive (positive lab tests), in_treatment (current ETU/CTC occupancy).
- If a figure is absent or ambiguous, do not include it.
- ICD-11 codes: Ebola Sudan: 1D60.0, Ebola Zaire: 1D60.1, Bundibugyo virus: 1D60.2, Marburg: 1C90.0, mpox: 1E71, cholera: 1A00.`;

export const FEW_SHOTS = `\
Example document: "As of 15 May 2026, 47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province. Rwampara Health Zone accounts for 28 cases. Four deaths occurred among healthcare workers at Mongbwalu General Referral Hospital."

Example call: extract_case_counts({ extractions: [
  { pathogen_icd11: "1D60.2", country_iso3: "COD", metric: "confirmed", value: 47,
    as_of: "2026-05-15", is_new_in_period: false,
    source_quote: { char_start: 19, char_end: 101,
      quote_text: "47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province" } },
  { pathogen_icd11: "1D60.2", country_iso3: "COD", metric: "deaths", value: 12,
    as_of: "2026-05-15", is_new_in_period: false,
    source_quote: { char_start: 19, char_end: 101,
      quote_text: "47 cumulative confirmed cases and 12 deaths have been reported from Ituri Province" } },
  { pathogen_icd11: "1D60.2", country_iso3: "COD", admin_name: "Rwampara", metric: "cases",
    value: 28, as_of: "2026-05-15",
    source_quote: { char_start: 103, char_end: 145,
      quote_text: "Rwampara Health Zone accounts for 28 cases" } },
  { pathogen_icd11: "1D60.2", country_iso3: "COD", admin_name: "Mongbwalu", metric: "hcw_deaths",
    value: 4, as_of: "2026-05-15",
    source_quote: { char_start: 147, char_end: 231,
      quote_text: "Four deaths occurred among healthcare workers at Mongbwalu General Referral Hospital" } }
]})`;
