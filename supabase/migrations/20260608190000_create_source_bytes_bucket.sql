begin;

-- G-11: private Storage bucket for raw PDF/HTML archival.
-- Service role bypasses RLS automatically; no bucket-level policy needed.
-- file_size_limit = 50 MiB (52428800 bytes).
insert into storage.buckets (id, name, public, file_size_limit)
values ('source-bytes', 'source-bytes', false, 52428800)
on conflict (id) do nothing;

commit;
