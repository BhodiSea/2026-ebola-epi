begin;

-- Deduplicate existing rows before creating the unique index.
-- On remotes bootstrapped from a schema dump, re-extraction may have written
-- duplicate (document_id, char_start, char_end) tuples. Keep the row with the
-- smallest id (first insertion) per group.
-- Step 1: re-point case_counts.source_quote_id from any duplicate → its keeper,
--         so the subsequent DELETE does not violate the FK constraint.
with dupes as (
  select id,
         first_value(id) over (
           partition by document_id, char_start, char_end
           order by id
           rows between unbounded preceding and unbounded following
         ) as keeper_id
  from public.source_quotes
),
real_dupes as (
  select id, keeper_id from dupes where id <> keeper_id
)
update public.case_counts cc
set source_quote_id = rd.keeper_id
from real_dupes rd
where cc.source_quote_id = rd.id;

-- Step 2: delete the now-unreferenced duplicate rows.
delete from public.source_quotes
where id in (
  select id from (
    select id,
           row_number() over (
             partition by document_id, char_start, char_end
             order by id
           ) as rn
    from public.source_quotes
  ) ranked
  where rn > 1
);

-- NEW-P2q: prevent duplicate source_quote rows for the same (document, offset range).
-- The upsertSourceQuote helper uses onConflictDoNothing + SELECT fallback so
-- re-extraction of the same document is idempotent rather than erroring.
create unique index if not exists source_quotes_doc_offsets_udx
  on public.source_quotes (document_id, char_start, char_end);

commit;
