# Gold set: Marburg virus disease — Tanzania, 2026

**ICD-11:** 1D61  
**Country:** TZA  
**Reference date:** 2026-05-01

## Source document

Drop the WHO DON or Tanzania MoH press release for the 2026 Marburg outbreak as `source.txt`
(plain text) or `source.html`.

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
