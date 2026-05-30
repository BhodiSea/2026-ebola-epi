# Gold set: Marburg virus disease — Tanzania, 2026

**ICD-11:** 1D61  
**Country:** TZA  
**Reference date:** 2026-05-01

## Source document

**SYNTHETIC** — `source.txt` contains a plausible WHO-style sitrep synthesised for eval
purposes. No real WHO DON for a Marburg outbreak in Tanzania of this scope exists as of
the eval authoring date (2026-05-30). Ground-truth figures (5 confirmed, 2 deaths) are
fabricated; replace with real figures if a real sitrep becomes available.

## Ground-truth format

Each tuple in `ground-truth.json`:

```json
{
  "pathogen_icd11": "1D61",
  "country_iso3": "TZA",
  "metric": "confirmed | deaths | suspected | healthcare_workers",
  "value": 0,
  "as_of": "YYYY-MM-DD"
}
```

Add one object per metric per reporting date extracted from the source. Leave the array empty
(`[]`) until a real sitrep is available — the offline eval runner skips empty dirs.
