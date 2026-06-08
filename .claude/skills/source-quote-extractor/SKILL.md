---
name: source-quote-extractor
description: Extract source_quotes rows with verified (char_start, char_end, text) offsets from WHO/AFRO/Africa CDC/ECDC sitrep PDFs and HTML. Use whenever the user mentions ingesting a sitrep, extracting quotes, building provenance, or backfilling source_quotes.
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
   - Compute `sha256` of the resulting canonical text. Store it on the
     **`public.documents`** row (`sha256 bytea not null`), not on
     `source_quotes`. `source_quotes` has no sha256 column.
   - Two-column PDF layouts may reorder text; verify each substring before
     trusting offsets.

2. **Per claim (the LLM tool-use output names them):**
   - Take the LLM-returned `char_start`, `char_end`, and `text`.
   - **Exact check:** verify `canonicalText.slice(char_start, char_end) === text`.
   - **`indexOf` fallback:** if the exact check fails, run
     `canonicalText.indexOf(text)`. If found, derive the corrected
     `char_start`/`char_end` from that position.
   - **Reject:** if `indexOf` returns -1, the `text` is not verbatim in the
     document. Do not insert a `source_quotes` row. Increment the
     `substring_verify_fail` counter on the `extraction_runs` row.
   - A second consecutive `substring_verify_fail` on the same document
     opens a GitHub issue (implemented in `extract-document.ts`) for
     manual review.

3. **Insert `source_quotes`.**
   ```sql
   insert into public.source_quotes (document_id, char_start, char_end, text)
   values ($1, $2, $3, $4)
   on conflict (document_id, char_start, char_end) do nothing
   returning id;
   ```

4. **Return** the resulting `source_quote_id` to the runner so it can stamp
   the fact row.

## Double-layer enforcement

The application-side check in step 2 is the primary guard. A DB trigger
(`source_quotes_verify_substring`) provides a second layer: it raises an
exception if `documents.text` does not contain the inserted quote at the
claimed offsets. The two layers together prevent provenance drift if the
application check is ever bypassed.

## Gotchas

- **Multi-page numbers.** A figure split across two pages can produce two
  candidate spans; the LLM must pick one. Accept the longer.
- **Never trust LLM-returned offsets without the substring check.** That
  rule alone catches ~90% of provenance regressions in the wild.

## Forbidden

- Inserting a `source_quotes` row with offsets that don't substring-match.
- Re-using the same `(document_id, char_start, char_end)` for two different
  texts — enforce uniqueness in the schema.
- Mutating canonical text after the `sha256` is computed (sha256 lives on
  `public.documents`, not on `source_quotes`).
- Fuzzy/approximate matching (Levenshtein, NFKC normalisation, OCR
  fallback) — those are aspirations tracked in
  [docs/ingest/03-future-work-ocr.md](docs/ingest/03-future-work-ocr.md).

## References

- `references/pdf-extraction.md` — `unpdf` + column-handling notes.
