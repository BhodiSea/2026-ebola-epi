begin;

-- NEW-P2q: prevent duplicate source_quote rows for the same (document, offset range).
-- The upsertSourceQuote helper uses onConflictDoNothing + SELECT fallback so
-- re-extraction of the same document is idempotent rather than erroring.
create unique index if not exists source_quotes_doc_offsets_udx
  on public.source_quotes (document_id, char_start, char_end);

commit;
