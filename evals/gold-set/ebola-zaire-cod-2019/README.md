# Gold set: Ebola virus disease (Zaire) — DRC, 2018-2020 (10th outbreak)

**ICD-11:** 1D60.1  
**Country:** COD  
**Reference date:** 2019 (representative sitrep date TBD)

## Source document

Drop a WHO AFRO sitrep or WHO DON for the 10th EVD outbreak in DRC as `source.txt` or
`source.html`. The outbreak ran August 2018 – June 2020 across North Kivu and Ituri.

## Ground-truth format

```json
{
  "pathogen_icd11": "1D60.1",
  "country_iso3": "COD",
  "metric": "confirmed | deaths | suspected | healthcare_workers",
  "value": 0,
  "as_of": "YYYY-MM-DD"
}
```

Add one object per metric per date. Leave `[]` until a real sitrep is curated.
