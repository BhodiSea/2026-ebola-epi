begin;

-- ─── source_quotes: enforce non-negative char_start ───────────────────────────
-- Without this, substring(text from negative+1 for n) clamps to position 1 and
-- silently accepts a quote_text that matches the wrong slice of the document.
-- The tg_verify_quote_substring trigger only checks equality — it cannot detect
-- that char_start semantics were violated by a negative offset.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'source_quotes_char_start_non_negative'
      and conrelid = 'public.source_quotes'::regclass
  ) then
    alter table public.source_quotes
      add constraint source_quotes_char_start_non_negative check (char_start >= 0);
  end if;
end $$;

-- ─── audit schema: RLS for defense-in-depth ───────────────────────────────────
-- init_schemas.sql already revokes schema-level USAGE from anon/authenticated.
-- Enabling RLS here means a future grant of schema usage does not automatically
-- open these tables — default-deny (no SELECT policy) applies to non-superusers.
alter table audit.extraction_runs enable row level security;
alter table audit.agent_actions enable row level security;

commit;
