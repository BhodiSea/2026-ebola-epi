---
name: source-quote-extractor
description: Extract source_quotes rows with verified (char_start, char_end, text, sha256) offsets from WHO/AFRO/Africa CDC/ECDC sitrep PDFs and HTML. Use whenever the user mentions ingesting a sitrep, extracting quotes, building provenance, or backfilling source_quotes.
allowed-tools: Read, Write, Glob, Grep, Bash(pnpm exec tsx:*), Bash(npx tsx:*)
---

# Source-quote extractor

For every sitrep ingested, every numeric or factual claim that will be
rendered in the UI MUST have a corresponding `source_quotes` row with exact
character offsets into the canonical text of the document. The UI's
hover-to-quote tooltip and "Open source" interaction depend on those
offsets being correct.

## Steps

1. **Canonical text extraction.**
   - PDF: `unpdf`'s `extractText(buf, { mergePages: true })`.
   - HTML: `linkedom` + a sanitizer that strips nav/footer; keep `<p>`
     boundaries as `\n\n`.
   - Compute `sha256` of the resulting canonical text. Store it.
   - Two-column PDF layouts may reorder text; verify each substring before
     trusting offsets.

2. **Per claim (the LLM tool-use output names them):**
   - Take the LLM-returned `char_start`, `char_end`, and `text`.
   - Verify `canonicalText.substring(char_start, char_end) === text`
     (exact match preferred).
   - On exact mismatch, fall back to Levenshtein distance ≤ 5; allow
     and log the small drift.
   - On larger mismatch, **reject the extraction**. Do not insert a
     `source_quotes` row. Mark the `extraction_runs` row with the rejected
     count for downstream alerting.

3. **Insert `source_quotes`.**
   ```sql
   insert into public.source_quotes (sitrep_id, char_start, char_end, text, sha256)
   values ($1, $2, $3, $4, $5)
   on conflict (sitrep_id, char_start, char_end) do update set text = excluded.text
   returning id;
   ```

4. **Return** the resulting `source_quote_id` to the runner so it can stamp
   the fact row.

## Gotchas

- **Mojibake.** Some WHO PDFs are encoded with non-Latin replacements for
  accented characters. Normalize with NFKC before hashing AND before
  offset comparison.
- **Multi-page numbers.** A figure split across two pages can produce two
  candidate spans; the LLM must pick one. Accept the longer.
- **Images / scanned tables.** Some sitreps embed tables as images; those
  need OCR (Claude vision or `tesseract.js`). Mark the extraction with
  `extraction_method = 'vision'` in `extraction_runs`.
- **Never trust LLM-returned offsets without the substring check.** That
  rule alone catches ~90% of provenance regressions in the wild.

## Forbidden

- Inserting a `source_quotes` row with offsets that don't substring-match.
- Re-using the same `(sitrep_id, char_start, char_end)` for two different
  texts — enforce uniqueness in the schema.
- Mutating canonical text after the `sha256` is computed.

## References

- `references/pdf-extraction.md` — `unpdf` + column-handling notes.
- `references/ocr.md` — vision and tesseract fallback patterns.
