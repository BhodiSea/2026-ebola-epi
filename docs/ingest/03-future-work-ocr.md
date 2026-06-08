# Future work — OCR and fuzzy matching

These capabilities were considered during initial design but are not
implemented. They are tracked here so the ideas are not lost, and so agents
reading [`.claude/skills/source-quote-extractor/SKILL.md`](.claude/skills/source-quote-extractor/SKILL.md)
know the current system makes no such guarantees.

## Levenshtein fallback

**Aspiration:** accept a quote when `levenshtein(canonical_slice, quote_text) ≤ 5`,
to tolerate minor OCR drift or PDF ligature differences.

**Not implemented because:** fuzzy matching would allow provenance claims that
do not literally appear in the source, violating the verbatim-quote contract
the UI tooltip depends on. Any implementation must first define an acceptable
drift policy, add a `match_method` column to `source_quotes`, and update the
UI tooltip to display the uncertainty.

## NFKC normalisation

**Aspiration:** run NFKC Unicode normalisation on both the canonical document
text and the LLM-returned quote before comparison, to handle WHO PDF
mojibake (accented characters encoded as non-Latin replacements).

**Not implemented because:** normalising before storing offsets would make the
stored `char_start`/`char_end` refer to the normalised string, not the raw
document bytes. The `source_quotes_verify_substring` DB trigger compares
against `documents.text` (raw). The whole offset model would need revisiting
before NFKC can be turned on safely.

**When to revisit:** after confirming whether the production WHO DON PDFs
actually exhibit this problem. If they do, consider normalising `documents.text`
at ingest time (store the normalised form as canonical) and recomputing sha256
over the normalised text.

## OCR / vision fallback for scanned tables

**Aspiration:** when a sitrep embeds case-count tables as images rather than
selectable text, fall back to Claude vision or `tesseract.js`, and mark the
extraction with `extraction_method = 'vision'` in `extraction_runs`.

**Not implemented because:** this path requires an `extraction_method` column
in `extraction_runs`, separate UI rendering for vision-derived quotes (no
char-offset tooltip, only image region), and a decision on whether to store
image-crop coordinates in `source_quotes` instead of char offsets.

**Prior art:** `tesseract.js` is available as an npm package; Claude vision
can process PDF page renders. Either approach is viable once the schema
extension is agreed.
